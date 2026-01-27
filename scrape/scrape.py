import requests
from bs4 import BeautifulSoup
import os

BASE_URL = "https://www.metrotukku.fi"
START_URL = "https://www.metrotukku.fi/fi/EUR/search?q=*%3A&page=&sort=relevance&pageSize=200"

headers = {
    "User-Agent": "Mozilla/5.0"
}

FRAMES_DIR = os.path.join(os.path.dirname(__file__), "images")
os.makedirs(FRAMES_DIR, exist_ok=True)

def scrape_products():
    r = requests.get(START_URL, headers=headers, timeout=30)
    soup = BeautifulSoup(r.text, "html.parser")

    products = []

    for item in soup.select(".product-list-item"):
        name_elem = item.select_one(".productMainLink")
        price_elem = item.select_one(".price")

        if not name_elem:
            continue

        name = name_elem.text.strip()
        product_url = BASE_URL + name_elem["href"]
        product_code = name_elem.get("data-product-code") or item.select_one(".product-code-container").text.strip()

        image_url = None
        image_elem = item.select_one(".thumb img")
        if image_elem and image_elem.get("src"):
            image_url = BASE_URL + image_elem["src"]
        
        # We are now storing the source URL directly, so we skip downloading/uploading to Supabase Storage.
        # The previous logic for Supabase Storage is removed.

        try:
            price = float(price_elem.text.replace("€", "").replace(",", ".").strip()) if price_elem else 0.0
        except (ValueError, AttributeError):
            price = 0.0

        products.append({
            "name": name,
            "price": price,
            "url": product_url,
            "image_url": image_url,
            "code": product_code
        })

    print(products)

    return products


if __name__ == "__main__":
    scrape_products()