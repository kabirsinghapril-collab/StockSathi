"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    total_revenue: 0,
    total_items_sold: 0,
    total_sales: 0,
  });

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("General");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [saleQuantities, setSaleQuantities] = useState<any>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) alert(error.message);
  };

  const signup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) alert(error.message);
    else alert("Signup done. Now login.");
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const fetchProducts = async () => {
    const res = await fetch("http://127.0.0.1:8000/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  const fetchSales = async () => {
    const res = await fetch("http://127.0.0.1:8000/sales");
    const data = await res.json();
    setSales(Array.isArray(data) ? data : []);
  };

  const fetchSummary = async () => {
    const res = await fetch("http://127.0.0.1:8000/sales/summary");
    const data = await res.json();
    setSummary(data);
  };

  const refreshAll = async () => {
    await fetchProducts();
    await fetchSales();
    await fetchSummary();
  };

  useEffect(() => {
    if (session) refreshAll();
  }, [session]);

  const addProduct = async () => {
    if (!name || !quantity || !price) {
      alert("Fill all fields");
      return;
    }

    await fetch("http://127.0.0.1:8000/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        quantity: Number(quantity),
        price: Number(price),
        category,
        low_stock_threshold: 5,
      }),
    });

    setName("");
    setQuantity("");
    setPrice("");
    setCategory("General");
    refreshAll();
  };

  const recordSale = async (productId: number) => {
    const qty = Number(saleQuantities[productId] || 0);

    if (qty <= 0) {
      alert("Enter sale quantity");
      return;
    }

    const res = await fetch("http://127.0.0.1:8000/sales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: productId,
        quantity_sold: qty,
      }),
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    setSaleQuantities({
      ...saleQuantities,
      [productId]: "",
    });

    refreshAll();
  };

  if (!session) {
    return (
      <div style={pageStyle}>
        <div style={authBox}>
          <h1>🔐 StockSathi Login</h1>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          <br />

          <button onClick={login} style={blackButton}>
            Login
          </button>

          <button onClick={signup} style={blueButton}>
            Signup
          </button>
        </div>
      </div>
    );
  }

  const cleanProducts = products.filter((p) => p.name);

  const categories = [
    "All",
    ...Array.from(new Set(cleanProducts.map((p) => p.category || "General"))),
  ];

  const filteredProducts = cleanProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "All" || (p.category || "General") === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalProducts = cleanProducts.length;

  const lowStockCount = cleanProducts.filter(
    (p) => Number(p.quantity || 0) <= Number(p.low_stock_threshold || 5),
  ).length;

  const inventoryValue = cleanProducts.reduce(
    (sum, p) => sum + Number(p.price || 0) * Number(p.quantity || 0),
    0,
  );

  const chartData = filteredProducts.map((p) => ({
    name: String(p.name).slice(0, 12),
    quantity: Number(p.quantity || 0),
  }));

  return (
    <div style={pageStyle}>
      <div style={topBar}>
        <h1>📦 StockSathi Dashboard</h1>

        <button onClick={logout} style={deleteButton}>
          Logout
        </button>
      </div>

      <p>Logged in as: {session.user.email}</p>

      <div style={cardsContainer}>
        <div style={cardStyle}>
          <h3>Total Products</h3>
          <h1>{totalProducts}</h1>
        </div>

        <div style={{ ...cardStyle, background: "#fff3cd" }}>
          <h3>Low Stock Items</h3>
          <h1>{lowStockCount}</h1>
        </div>

        <div style={{ ...cardStyle, background: "#d4edda" }}>
          <h3>Inventory Value</h3>
          <h1>₹{inventoryValue.toLocaleString()}</h1>
        </div>

        <div style={{ ...cardStyle, background: "#dbeafe" }}>
          <h3>Total Revenue</h3>
          <h1>₹{summary.total_revenue.toLocaleString()}</h1>
        </div>

        <div style={{ ...cardStyle, background: "#ede9fe" }}>
          <h3>Items Sold</h3>
          <h1>{summary.total_items_sold}</h1>
        </div>

        <div style={{ ...cardStyle, background: "#fee2e2" }}>
          <h3>Total Sales</h3>
          <h1>{summary.total_sales}</h1>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2>🔍 Search & Filter</h2>

        <input
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: "300px" }}
        />

        <select
          aria-label="Category Filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={inputStyle}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div style={sectionStyle}>
        <h2>📊 Inventory Stock Chart</h2>

        {chartData.length === 0 ? (
          <p>No chart data.</p>
        ) : (
          <div style={{ width: "100%", height: "300px", minHeight: "300px" }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div style={sectionStyle}>
        <h2>Add Product</h2>

        <input
          placeholder="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        />

        <button onClick={addProduct} style={blackButton}>
          Add Product
        </button>
      </div>

      <h2>Products + Sales</h2>

      {filteredProducts.map((product) => (
        <div key={product.id} style={productCard}>
          <h3>{product.name}</h3>
          <p>Category: {product.category || "General"}</p>
          <p>Stock: {product.quantity}</p>
          <p>Price: ₹{product.price}</p>

          <input
            placeholder="Sell quantity"
            value={saleQuantities[product.id] || ""}
            onChange={(e) =>
              setSaleQuantities({
                ...saleQuantities,
                [product.id]: e.target.value,
              })
            }
            style={inputStyle}
          />

          <button onClick={() => recordSale(product.id)} style={greenButton}>
            Sell Product
          </button>
        </div>
      ))}

      <div style={sectionStyle}>
        <h2>💰 Sales History</h2>

        {sales.length === 0 ? (
          <p>No sales yet.</p>
        ) : (
          sales.map((sale) => (
            <div key={sale.id} style={saleCard}>
              <h3>{sale.product_name}</h3>
              <p>Quantity Sold: {sale.quantity_sold}</p>
              <p>Total: ₹{sale.total_amount}</p>
              <p>Date: {new Date(sale.created_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  padding: "30px",
  background: "#f4f4f4",
  minHeight: "100vh",
  fontFamily: "Arial",
};

const authBox = {
  background: "white",
  padding: "30px",
  borderRadius: "10px",
  maxWidth: "400px",
  margin: "80px auto",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const cardsContainer = {
  display: "flex",
  gap: "20px",
  marginBottom: "30px",
  flexWrap: "wrap" as const,
};

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  width: "250px",
};

const sectionStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  marginBottom: "30px",
};

const productCard = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  marginBottom: "15px",
  border: "1px solid #ddd",
};

const saleCard = {
  background: "#f9fafb",
  padding: "15px",
  borderRadius: "8px",
  marginBottom: "10px",
  border: "1px solid #ddd",
};

const inputStyle = {
  padding: "10px",
  marginRight: "10px",
  marginBottom: "10px",
};

const blackButton = {
  padding: "10px 20px",
  background: "black",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  marginRight: "10px",
};

const blueButton = {
  padding: "10px 20px",
  background: "blue",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const greenButton = {
  padding: "10px 20px",
  background: "green",
  color: "white",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};

const deleteButton = {
  background: "red",
  color: "white",
  border: "none",
  padding: "10px 15px",
  borderRadius: "5px",
  cursor: "pointer",
};
