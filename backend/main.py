from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import requests

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

@app.get("/")
def home():
    return {"message": "StockSathi Backend Running"}

@app.get("/products")
def get_products():
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=*",
        headers=headers,
    )
    return response.json()

@app.post("/products")
def add_product(product: dict):
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/products",
        headers=headers,
        json=product,
    )
    try:
        return response.json()
    except:
        return {"message": "Product added", "status": response.status_code}

@app.put("/products/{product_id}")
def update_product(product_id: int, product: dict):
    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
        headers=headers,
        json=product,
    )
    try:
        return response.json()
    except:
        return {"message": "Product updated", "status": response.status_code}

@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    response = requests.delete(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
        headers=headers,
    )
    return {"message": "Product deleted", "status": response.status_code}

@app.post("/sales")
def record_sale(sale: dict):
    product_id = sale["product_id"]
    quantity_sold = int(sale["quantity_sold"])

    product_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}&select=*",
        headers=headers,
    )

    products = product_response.json()

    if not products:
        return {"error": "Product not found"}

    product = products[0]
    current_quantity = int(product["quantity"])

    if quantity_sold > current_quantity:
        return {"error": "Not enough stock available"}

    sale_price = float(product["price"])
    total_amount = quantity_sold * sale_price
    new_quantity = current_quantity - quantity_sold

    sale_data = {
        "product_id": product_id,
        "product_name": product["name"],
        "quantity_sold": quantity_sold,
        "sale_price": sale_price,
        "total_amount": total_amount,
    }

    sale_response = requests.post(
        f"{SUPABASE_URL}/rest/v1/sales",
        headers=headers,
        json=sale_data,
    )

    requests.patch(
        f"{SUPABASE_URL}/rest/v1/products?id=eq.{product_id}",
        headers=headers,
        json={"quantity": new_quantity},
    )

    return {
        "message": "Sale recorded successfully",
        "sale": sale_response.json(),
        "remaining_stock": new_quantity,
    }

@app.get("/sales")
def get_sales():
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/sales?select=*&order=created_at.desc",
        headers=headers,
    )
    return response.json()

@app.get("/sales/summary")
def sales_summary():
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/sales?select=*",
        headers=headers,
    )

    sales = response.json()

    total_revenue = sum(float(sale["total_amount"]) for sale in sales)
    total_items_sold = sum(int(sale["quantity_sold"]) for sale in sales)
    total_sales = len(sales)

    return {
        "total_revenue": total_revenue,
        "total_items_sold": total_items_sold,
        "total_sales": total_sales,
    }

@app.get("/forecast")
def forecast_inventory():
    products_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/products?select=*",
        headers=headers,
    )

    sales_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/sales?select=*",
        headers=headers,
    )

    products = products_response.json()
    sales = sales_response.json()

    forecast_data = []

    for product in products:
        product_id = product["id"]
        product_name = product["name"]
        current_stock = int(product["quantity"])
        threshold = int(product.get("low_stock_threshold", 5))

        product_sales = [
            sale for sale in sales if sale["product_id"] == product_id
        ]

        total_sold = sum(int(sale["quantity_sold"]) for sale in product_sales)
        sales_count = len(product_sales)

        average_sale = total_sold / sales_count if sales_count > 0 else 0
        predicted_7_day_sales = round(average_sale * 7)

        if predicted_7_day_sales > current_stock:
            recommended_restock = predicted_7_day_sales - current_stock + 5
            risk = "High"
        elif current_stock <= threshold:
            recommended_restock = 10
            risk = "Medium"
        else:
            recommended_restock = 0
            risk = "Low"

        forecast_data.append({
            "product_id": product_id,
            "product_name": product_name,
            "current_stock": current_stock,
            "total_sold": total_sold,
            "predicted_7_day_sales": predicted_7_day_sales,
            "recommended_restock": recommended_restock,
            "risk": risk,
        })

    return forecast_data