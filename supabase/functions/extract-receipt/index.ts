import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        let userId = 'anonymous';

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const base64Url = parts[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const payload = JSON.parse(atob(base64));
                    userId = payload.sub || payload.user_id || 'unknown';
                }
            } catch (decodeError) {
                console.warn('Could not decode token:', decodeError.message);
            }
        }

        const body = await req.json();
        let rawImage = body.imageBase64 || body.image;

        if (!rawImage) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing image data' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        let base64Data = rawImage;
        let mimeType = 'image/jpeg';

        if (rawImage.includes('base64,')) {
            const matches = rawImage.match(/data:(image\/(jpeg|jpg|png|gif|webp)|application\/pdf);base64,/);
            if (matches) {
                mimeType = matches[1];
                if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
            }
            base64Data = rawImage.split('base64,')[1];
        } else if (base64Data.startsWith('/9j')) {
            mimeType = 'image/jpeg';
        } else if (base64Data.startsWith('iVBOR')) {
            mimeType = 'image/png';
        } else if (base64Data.startsWith('JVBERi0')) {
            mimeType = 'application/pdf';
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

        // Optimized concise prompt for faster extraction
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
        console.log('Raw AI Response:', responseText);

        if (!responseText) {
            return new Response(
                JSON.stringify({ success: false, error: 'No response from AI' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        let receiptData;
        try {
            receiptData = JSON.parse(responseText);
        } catch (parseError) {
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to parse receipt data' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        if (!receiptData.items || !Array.isArray(receiptData.items)) {
            receiptData.items = [];
        }

        // Filter out any grouped/summary items that slipped through
        receiptData.items = receiptData.items.filter((item: any) => {
            const name = (item.name || '').toLowerCase();
            // Remove items that look like summaries
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

        receiptData.items = receiptData.items.map((item: any, index: number) => ({
            id: `item-${index + 1}`,
            name: item.name || 'Unknown Item',
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'kpl',
            pricePerUnit: parseFloat(item.pricePerUnit) || 0,
            totalPrice: parseFloat(item.totalPrice) || 0,
            receivedQuantity: null,
            status: 'pending',
        }));

        console.log('Extracted', receiptData.items.length, 'individual items');

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
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Failed to process receipt' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
