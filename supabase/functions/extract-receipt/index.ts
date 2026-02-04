import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-expect-error: Deno-specific import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
    env: {
        get: (key: string) => string | undefined;
    };
};

// SECURITY: Restrict CORS to specific origins
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean);

// SECURITY: Maximum file size (10MB in base64 is ~13.3MB due to encoding overhead)
const MAX_BASE64_SIZE = 14 * 1024 * 1024; // 14MB to account for base64 overhead

function getCorsHeaders(origin: string | null): Record<string, string> {
    const isAllowed = allowedOrigins.length === 0
        ? false
        : allowedOrigins.includes(origin || '') || allowedOrigins.includes('*');

    return {
        'Access-Control-Allow-Origin': isAllowed ? (origin || '') : '',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
}

// SECURITY: Verify JWT token
async function verifyAndGetUserId(authHeader: string | null): Promise<string> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return 'anonymous';
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Try to verify with Supabase auth first
    const userClient = createClient(supabaseUrl, anonKey, {
        global: {
            headers: { Authorization: `Bearer ${token}` }
        }
    });

    const { data: userData, error: authError } = await userClient.auth.getUser(token);

    if (!authError && userData?.user) {
        return userData.user.id;
    }

    // Fallback for Clerk tokens: decode and validate format
    // The gateway's verify_jwt should have already validated the signature
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return 'unknown';
        }

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.sub || payload.user_id;

        // Validate user ID format (Clerk IDs start with 'user_')
        if (userId && typeof userId === 'string' && userId.startsWith('user_')) {
            return userId;
        }

        return 'unknown';
    } catch {
        return 'unknown';
    }
}

serve(async (req) => {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        const userId = await verifyAndGetUserId(authHeader);

        const body = await req.json();
        let rawImage = body.imageBase64 || body.image;

        if (!rawImage) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing image data' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // SECURITY: Validate file size before processing
        if (typeof rawImage !== 'string') {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid image data format' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        if (rawImage.length > MAX_BASE64_SIZE) {
            return new Response(
                JSON.stringify({ success: false, error: 'Image too large. Maximum size is 10MB.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        let base64Data = rawImage;
        let mimeType = 'image/jpeg';

        // SECURITY: Validate MIME type against whitelist
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

        if (rawImage.includes('base64,')) {
            const matches = rawImage.match(/data:(image\/(jpeg|jpg|png|gif|webp)|application\/pdf);base64,/);
            if (matches) {
                mimeType = matches[1];
                if (mimeType === 'image/jpg') mimeType = 'image/jpeg';

                if (!allowedMimeTypes.includes(mimeType)) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Unsupported file type' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                    );
                }
            }
            const splitResult = rawImage.split('base64,');
            if (splitResult.length < 2 || !splitResult[1]) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Invalid base64 data format' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
            }
            base64Data = splitResult[1];
        } else if (base64Data.startsWith('/9j')) {
            mimeType = 'image/jpeg';
        } else if (base64Data.startsWith('iVBOR')) {
            mimeType = 'image/png';
        } else if (base64Data.startsWith('JVBERi0')) {
            mimeType = 'application/pdf';
        }

        // SECURITY: Validate base64 string format
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(base64Data)) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid base64 encoding' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) {
            return new Response(
                JSON.stringify({ success: false, error: 'API key not set' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        const receiptSchema = {
            type: "object",
            properties: {
                supplier_name: { type: "string" },
                date: { type: "string" },
                order_number: { type: "string", nullable: true },
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            quantity: { type: "number" },
                            unit: { type: "string" },
                            pricePerUnit: { type: "number" },
                            totalPrice: { type: "number" }
                        },
                        required: ["name", "quantity", "unit", "pricePerUnit", "totalPrice"]
                    }
                },
                totalValue: { type: "number" }
            },
            required: ["supplier_name", "date", "items", "totalValue"]
        };

        const extractionPrompt = `Extract product items from this receipt/invoice. Return JSON only.

RULES:
- Extract ONLY individual product lines (name, quantity, unit price)
- SKIP: totals, subtotals, tax lines, payment methods, headers, footers
- SKIP lines with: yhteensä, summa, ALV, vero, total, subtotal
- Supplier name from top, date as YYYY-MM-DD, prices as numbers

If unreadable: {"error": "Could not read receipt"}`;

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Data,
                                },
                            },
                            { text: extractionPrompt },
                        ],
                    }],
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 4096,
                        responseMimeType: "application/json",
                        responseSchema: receiptSchema
                    },
                }),
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            return new Response(
                JSON.stringify({ success: false, error: 'AI processing failed: ' + errorText }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        const geminiResult = await geminiResponse.json();
        const responseText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            return new Response(
                JSON.stringify({ success: false, error: 'No response from AI' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        let receiptData;
        try {
            receiptData = JSON.parse(responseText);
        } catch {
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to parse receipt data' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        if (!receiptData.items || !Array.isArray(receiptData.items)) {
            receiptData.items = [];
        }

        // Filter out any grouped/summary items that slipped through
        receiptData.items = receiptData.items.filter((item: { name?: string }) => {
            const name = (item.name || '').toLowerCase();
            const isSummary =
                name.includes('yhteensä') ||
                name.includes('total') ||
                name.includes('summa') ||
                name === 'non-food' ||
                name === 'nonfood' ||
                name === 'käyttötavara' ||
                name === 'elintarvikkeet' ||
                name.startsWith('alv ') ||
                name.startsWith('vero');
            return !isSummary;
        });

        receiptData.items = receiptData.items.map((item: {
            name?: string;
            quantity?: number | string;
            unit?: string;
            pricePerUnit?: number | string;
            totalPrice?: number | string;
        }, index: number) => ({
            id: `item-${index + 1}`,
            name: item.name || 'Unknown Item',
            quantity: parseFloat(String(item.quantity)) || 1,
            unit: item.unit || 'kpl',
            pricePerUnit: parseFloat(String(item.pricePerUnit)) || 0,
            totalPrice: parseFloat(String(item.totalPrice)) || 0,
            receivedQuantity: null,
            status: 'pending',
        }));

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    supplier_name: receiptData.supplier_name || 'Unknown',
                    date: receiptData.date || new Date().toISOString().split('T')[0],
                    order_number: receiptData.order_number || null,
                    items: receiptData.items,
                    totalValue: parseFloat(receiptData.totalValue) || 0,
                },
                userId: userId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        const err = error as Error;
        return new Response(
            JSON.stringify({ success: false, error: err.message || 'Failed to process receipt' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
