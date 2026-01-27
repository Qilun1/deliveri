from supabase import create_client
from scrape import scrape_products
from dotenv import load_dotenv
import os


load_dotenv()
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def save_to_supabase(products):
    print(supabase.table("metrotukku_products"))
    try:
        supabase.table("metrotukku_products").upsert(
            products,
            on_conflict="url"
        ).execute()
    except Exception as e:
        error_str = str(e)
        if "there is no unique or exclusion constraint matching the ON CONFLICT specification" in error_str:
            print("\n" + "="*60)
            print("ERROR: Missing Database Constraint")
            print("The 'metrotukku_products' table needs a UNIQUE constraint on the 'url' column")
            print("for the upsert operation to work.")
            print("\nPlease run the following SQL in your Supabase Dashboard:")
            print("ALTER TABLE metrotukku_products ADD CONSTRAINT metrotukku_products_url_key UNIQUE (url);")
            print("="*60 + "\n")
        elif "new row violates row-level security policy" in error_str:
            print("\n" + "="*60)
            print("ERROR: RLS Policy Violation")
            print("The database rejected the write operation due to Row-Level Security.")
            print("Your script is using the ANON key, which is restricted by default.")
            print("\nPlease run the following SQL in your Supabase Dashboard to allow access:")
            print("CREATE POLICY \"Allow public access\" ON metrotukku_products FOR ALL TO anon USING (true) WITH CHECK (true);")
            print("="*60 + "\n")
        raise e

if __name__ == "__main__":
    products = scrape_products()
    save_to_supabase(products)
    print(f"Saved {len(products)} products")
