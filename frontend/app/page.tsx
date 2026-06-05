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
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
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
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session),
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
  };

  const signup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Signup done. Now login.");
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const fetchProducts = async () => {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  };

  const fetchSales = async () => {
    const res = await fetch(`${API_URL}/sales`);
    const data = await res.json();
    setSales(Array.isArray(data) ? data : []);
  };

  const fetchSummary = async () => {
    const res = await fetch(`${API_URL}/sales/summary`);
    const data = await res.json();
    setSummary(data);
  };

  const fetchForecast = async () => {
    const res = await fetch(`${API_URL}/forecast`);
    const data = await res.json();
    setForecast(Array.isArray(data) ? data : []);
  };

  const refreshAll = async () => {
    await fetchProducts();
    await fetchSales();
    await fetchSummary();
    await fetchForecast();
  };

  useEffect(() => {
    if (session) refreshAll();
  }, [session]);

  const addProduct = async () => {
    if (!name || !quantity || !price) {
      alert("Fill all fields");
      return;
    }

    await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    const res = await fetch(`${API_URL}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    setSaleQuantities({ ...saleQuantities, [productId]: "" });
    refreshAll();
  };

  if (!session) {
    return (
      <main style={authPage}>
        <div style={authCard}>
          <div style={logoBox}>📦</div>
          <h1 style={authTitle}>StockSathi</h1>
          <p style={mutedText}>
            Inventory, sales, analytics and AI forecasting in one dashboard.
          </p>

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

          <button onClick={login} style={primaryButton}>
            Login
          </button>
          <button onClick={signup} style={secondaryButton}>
            Create Account
          </button>
        </div>
      </main>
    );
  }

  const cleanProducts = products.filter((p) => p.name);
  const cleanForecast = forecast.filter((item) => item.product_name);

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
    <main style={appShell}>
      <aside style={sidebar}>
        <div style={brand}>
          <div style={brandIcon}>📦</div>
          <div>
            <h2 style={{ margin: 0 }}>StockSathi</h2>
            <p style={smallMuted}>AI Inventory SaaS</p>
          </div>
        </div>

        <nav style={navBox}>
          <p style={navItemActive}>Dashboard</p>
          <p style={navItem}>Inventory</p>
          <p style={navItem}>Sales</p>
          <p style={navItem}>AI Forecast</p>
        </nav>

        <button onClick={logout} style={logoutButton}>
          Logout
        </button>
      </aside>

      <section style={mainContent}>
        <div style={hero}>
          <div>
            <p style={eyebrow}>Welcome back</p>
            <h1 style={heroTitle}>Inventory Command Center</h1>
            <p style={mutedText}>Logged in as {session.user.email}</p>
          </div>
          <button onClick={refreshAll} style={primaryButton}>
            Refresh Data
          </button>
        </div>

        <div style={statsGrid}>
          <StatCard title="Total Products" value={totalProducts} />
          <StatCard
            title="Low Stock Items"
            value={lowStockCount}
            tone="#fff7ed"
          />
          <StatCard
            title="Inventory Value"
            value={`₹${inventoryValue.toLocaleString()}`}
            tone="#ecfdf5"
          />
          <StatCard
            title="Total Revenue"
            value={`₹${summary.total_revenue.toLocaleString()}`}
            tone="#eff6ff"
          />
          <StatCard
            title="Items Sold"
            value={summary.total_items_sold}
            tone="#f5f3ff"
          />
          <StatCard
            title="Total Sales"
            value={summary.total_sales}
            tone="#fef2f2"
          />
        </div>

        <div style={twoColumn}>
          <section style={panel}>
            <h2>📊 Stock Analytics</h2>
            {chartData.length === 0 ? (
              <p style={mutedText}>No chart data yet.</p>
            ) : (
              <div style={{ width: "100%", height: "320px" }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#111827" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section style={panel}>
            <h2>🤖 AI Forecast</h2>
            {cleanForecast.slice(0, 4).map((item) => (
              <div key={item.product_id} style={forecastCard(item.risk)}>
                <strong>{item.product_name}</strong>
                <p>Stock: {item.current_stock}</p>
                <p>7-Day Prediction: {item.predicted_7_day_sales}</p>
                <p>Restock: {item.recommended_restock}</p>
                <span style={badge(item.risk)}>{item.risk} Risk</span>
              </div>
            ))}
          </section>
        </div>

        <section style={panel}>
          <h2>Add New Product</h2>
          <div style={formGrid}>
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
          </div>
          <button onClick={addProduct} style={primaryButton}>
            Add Product
          </button>
        </section>

        <section style={panel}>
          <div style={sectionHeader}>
            <h2>Products & Sales</h2>
            <div>
              <input
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={inputStyle}
              >
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={productGrid}>
            {filteredProducts.map((product) => (
              <div key={product.id} style={productCard}>
                <h3>{product.name}</h3>
                <p style={mutedText}>{product.category || "General"}</p>
                <p>
                  Stock: <strong>{product.quantity}</strong>
                </p>
                <p>
                  Price: <strong>₹{product.price}</strong>
                </p>

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

                <button
                  onClick={() => recordSale(product.id)}
                  style={successButton}
                >
                  Sell Product
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={panel}>
          <h2>💰 Sales History</h2>
          {sales.length === 0 ? (
            <p style={mutedText}>No sales yet.</p>
          ) : (
            sales.slice(0, 8).map((sale) => (
              <div key={sale.id} style={saleRow}>
                <strong>{sale.product_name}</strong>
                <span>Qty: {sale.quantity_sold}</span>
                <span>₹{sale.total_amount}</span>
                <span>{new Date(sale.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

function StatCard({ title, value, tone = "white" }: any) {
  return (
    <div style={{ ...statCard, background: tone }}>
      <p style={smallMuted}>{title}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
    </div>
  );
}

const appShell = {
  display: "flex",
  minHeight: "100vh",
  background: "#f8fafc",
  fontFamily: "Inter, Arial",
};
const sidebar = {
  width: "260px",
  background: "#020617",
  color: "white",
  padding: "24px",
  position: "fixed" as const,
  height: "100vh",
};
const mainContent = { marginLeft: "308px", padding: "32px", width: "100%" };
const brand = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  marginBottom: "40px",
};
const brandIcon = {
  background: "#56c3f9",
  padding: "12px",
  borderRadius: "14px",
  fontSize: "24px",
};
const navBox = { display: "grid", gap: "10px" };
const navItem = { padding: "12px", color: "#94a3b8" };
const navItemActive = {
  padding: "12px",
  background: "#1e293b",
  borderRadius: "12px",
};
const logoutButton = {
  marginTop: "40px",
  padding: "12px",
  width: "100%",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
};
const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "28px",
};
const eyebrow = { color: "#4b9af9", fontWeight: "bold", margin: 0 };
const heroTitle = { fontSize: "42px", margin: "6px 0" };
const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};
const statCard = {
  padding: "22px",
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 25px rgba(15,23,42,0.05)",
};
const twoColumn = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "20px",
  marginBottom: "24px",
};
const panel = {
  background: "white",
  padding: "24px",
  borderRadius: "22px",
  border: "1px solid #e5e7eb",
  marginBottom: "24px",
  boxShadow: "0 10px 25px rgba(15,23,42,0.05)",
};
const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};
const inputStyle = {
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  marginBottom: "10px",
};
const primaryButton = {
  padding: "12px 18px",
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
};
const secondaryButton = {
  padding: "12px 18px",
  background: "#3f9bf1",
  color: "white",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  marginLeft: "10px",
};
const successButton = {
  padding: "10px 14px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
};
const mutedText = { color: "#64748b" };
const smallMuted = { color: "#94a3b8", margin: "0 0 8px 0", fontSize: "14px" };
const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
};
const productCard = {
  padding: "18px",
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
};
const saleRow = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 2fr",
  padding: "14px",
  borderBottom: "1px solid #e5e7eb",
};
const authPage = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg,#020617,#1d4ed8)",
};
const authCard = {
  background: "white",
  padding: "36px",
  borderRadius: "24px",
  maxWidth: "420px",
  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
};
const logoBox = { fontSize: "42px" };
const authTitle = { fontSize: "36px", margin: "8px 0" };

const forecastCard = (risk: string) => ({
  padding: "14px",
  borderRadius: "14px",
  marginBottom: "12px",
  background:
    risk === "High" ? "#fef2f2" : risk === "Medium" ? "#fffbeb" : "#ecfdf5",
  border: "1px solid #e5e7eb",
});

const badge = (risk: string) => ({
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
  background:
    risk === "High" ? "#dc2626" : risk === "Medium" ? "#f59e0b" : "#16a34a",
  color: "white",
});
