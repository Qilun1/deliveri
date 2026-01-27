import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeliveries() {
    console.log('Checking deliveries table...');
    const { data, error } = await supabase
        .from('deliveries')
        .select('supplier_name, order_number, status')
        .limit(10);

    if (error) {
        console.error('Error fetching deliveries:', error);
    } else {
        console.log('Deliveries found:', data);
        const suppliers = [...new Set(data?.map(d => d.supplier_name))];
        console.log('Unique suppliers in DB:', suppliers);
    }
}

checkDeliveries();
