"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);

export default function Home() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [darkMode, setDarkMode] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [revenueIntel, setRevenueIntel] = useState<any>(null);

  const [team, setTeam] = useState<any[]>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("employee");

  const [chatMessage, setChatMessage] = useState("");
  const [chatReply, setChatReply] = useState("");

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

  const fetchInsights = async () => {
    const res = await fetch(`${API_URL}/business-insights`);
    const data = await res.json();
    setInsights(Array.isArray(data.insights) ? data.insights : []);
  };

  const fetchRevenueIntel = async () => {
    const res = await fetch(`${API_URL}/revenue-intelligence`);
    const data = await res.json();
    setRevenueIntel(data);
  };

  const fetchTeam = async () => {
    const res = await fetch(`${API_URL}/team`);
    const data = await res.json();
    setTeam(Array.isArray(data) ? data : []);
  };

  const refreshAll = async () => {
    await fetchProducts();
    await fetchSales();
    await fetchSummary();
    await fetchForecast();
    await fetchInsights();
    await fetchRevenueIntel();
    await fetchTeam();
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

  const addTeamMember = async () => {
    if (!memberEmail) {
      alert("Enter member email");
      return;
    }

    await fetch(`${API_URL}/team`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: memberEmail,
        role: memberRole,
      }),
    });

    setMemberEmail("");
    setMemberRole("employee");
    fetchTeam();
  };

  const askAI = async () => {
    if (!chatMessage) return;

    const res = await fetch(`${API_URL}/ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: chatMessage,
      }),
    });

    const data = await res.json();
    setChatReply(data.reply);
  };

  const generateInvoice = (
    productName: string,
    quantity: number,
    price: number,
  ) => {
    const doc = new jsPDF();
    const total = quantity * price;
    const invoiceNo = `INV-${Date.now()}`;

    doc.setFontSize(22);
    doc.text("StockSathi Invoice", 20, 20);

    doc.setFontSize(11);
    doc.text(`Invoice No: ${invoiceNo}`, 20, 35);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 43);

    doc.setFontSize(14);
    doc.text("Bill Details", 20, 60);

    doc.setFontSize(12);
    doc.text(`Product: ${productName}`, 20, 75);
    doc.text(`Quantity: ${quantity}`, 20, 85);
    doc.text(`Price: Rs. ${price}`, 20, 95);
    doc.text(`Total: Rs. ${total}`, 20, 105);

    doc.setFontSize(10);
    doc.text("Thank you for using StockSathi.", 20, 130);

    doc.save(`invoice-${productName || "product"}.pdf`);
  };

  const recordSale = async (productId: number) => {
    const qty = Number(saleQuantities[productId] || 0);

    if (qty <= 0) {
      alert("Enter sale quantity");
      return;
    }

    const product = products.find((p) => p.id === productId);

    const res = await fetch(`${API_URL}/sales`, {
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

    if (product) {
      generateInvoice(product.name, qty, Number(product.price));
    }

    setSaleQuantities({
      ...saleQuantities,
      [productId]: "",
    });

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
    <main style={darkMode ? darkAppShell : appShell}>
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
          <p style={navItem}>AI Advisor</p>
          <p style={navItem}>Revenue Intelligence</p>
          <p style={navItem}>Team</p>
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
            <p style={darkMode ? darkMutedText : mutedText}>
              Logged in as {session.user.email}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={primaryButton}
            >
              {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>

            <button onClick={refreshAll} style={primaryButton}>
              Refresh Data
            </button>
          </div>
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
          <section style={darkMode ? darkPanel : panel}>
            <h2>📊 Stock Analytics</h2>

            {chartData.length === 0 ? (
              <p style={darkMode ? darkMutedText : mutedText}>
                No chart data yet.
              </p>
            ) : (
              <div style={{ width: "100%", height: "320px" }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section style={darkMode ? darkPanel : panel}>
            <h2>🤖 AI Forecast</h2>

            {cleanForecast.length === 0 ? (
              <p style={darkMode ? darkMutedText : mutedText}>
                No forecast data yet.
              </p>
            ) : (
              cleanForecast.slice(0, 4).map((item) => (
                <div key={item.product_id} style={forecastCard(item.risk)}>
                  <strong>{item.product_name}</strong>
                  <p>Stock: {item.current_stock}</p>
                  <p>7-Day Prediction: {item.predicted_7_day_sales}</p>
                  <p>Restock: {item.recommended_restock}</p>
                  <span style={badge(item.risk)}>{item.risk} Risk</span>
                </div>
              ))
            )}
          </section>
        </div>

        <section style={darkMode ? darkPanel : panel}>
          <h2>🤖 AI Business Advisor</h2>

          {insights.length === 0 ? (
            <p style={darkMode ? darkMutedText : mutedText}>
              No insights available yet.
            </p>
          ) : (
            insights.map((item, index) => (
              <div key={index} style={darkMode ? darkInsightCard : insightCard}>
                {item}
              </div>
            ))
          )}
        </section>

        <section style={darkMode ? darkPanel : panel}>
          <h2>📈 Revenue Intelligence</h2>

          {!revenueIntel ? (
            <p style={darkMode ? darkMutedText : mutedText}>
              Loading revenue data...
            </p>
          ) : (
            <>
              <div style={statsGrid}>
                <StatCard
                  title="Revenue Intelligence"
                  value={`₹${revenueIntel.total_revenue.toLocaleString()}`}
                  tone="#ecfdf5"
                />

                <StatCard
                  title="Items Sold"
                  value={revenueIntel.total_items_sold}
                  tone="#eff6ff"
                />

                <StatCard
                  title="Low Stock Products"
                  value={revenueIntel.low_stock_count}
                  tone="#fff7ed"
                />
              </div>

              <div style={darkMode ? darkInsightCard : insightCard}>
                🏆 Top Product:
                <strong> {revenueIntel.top_product.name}</strong>
                <br />
                Sold: {revenueIntel.top_product.quantity_sold}
                <br />
                Revenue: ₹{revenueIntel.top_product.revenue.toLocaleString()}
              </div>

              <h3>⚠️ Low Stock Alerts</h3>

              {revenueIntel.low_stock_products.length === 0 ? (
                <p style={darkMode ? darkMutedText : mutedText}>
                  No low stock products.
                </p>
              ) : (
                revenueIntel.low_stock_products.map(
                  (item: any, index: number) => (
                    <div
                      key={index}
                      style={darkMode ? darkInsightCard : insightCard}
                    >
                      <strong>{item.name}</strong>
                      <br />
                      Current Stock: {item.quantity}
                      <br />
                      Threshold: {item.threshold}
                    </div>
                  ),
                )
              )}
            </>
          )}
        </section>

        <section style={darkMode ? darkPanel : panel}>
          <h2>👥 Team Management</h2>

          <div style={formGrid}>
            <input
              placeholder="Member Email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              style={inputStyle}
            />

            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              style={inputStyle}
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>

            <button onClick={addTeamMember} style={primaryButton}>
              Add Member
            </button>
          </div>

          <div style={{ marginTop: "20px" }}>
            {team.length === 0 ? (
              <p style={darkMode ? darkMutedText : mutedText}>
                No team members found.
              </p>
            ) : (
              team.map((member) => (
                <div
                  key={member.id}
                  style={darkMode ? darkInsightCard : insightCard}
                >
                  <strong>{member.email}</strong>

                  <br />
                  <br />

                  <select
                    value={member.role}
                    onChange={(e) => updateTeamRole(member.id, e.target.value)}
                    style={inputStyle}
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>

                  <button
                    onClick={() => deleteTeamMember(member.id)}
                    style={{
                      ...invoiceButton,
                      background: "#dc2626",
                      marginLeft: "10px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={darkMode ? darkPanel : panel}>
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

        <section style={darkMode ? darkPanel : panel}>
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
              <div
                key={product.id}
                style={darkMode ? darkProductCard : productCard}
              >
                <h3>{product.name}</h3>
                <p style={darkMode ? darkMutedText : mutedText}>
                  {product.category || "General"}
                </p>
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
                  Sell + Invoice
                </button>

                <button
                  onClick={() =>
                    generateInvoice(product.name, 1, Number(product.price))
                  }
                  style={invoiceButton}
                >
                  PDF Invoice
                </button>
              </div>
            ))}
          </div>
        </section>

        <section style={darkMode ? darkPanel : panel}>
          <h2>🤖 StockSathi AI Assistant</h2>

          <input
            placeholder="Ask StockSathi AI..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            style={inputStyle}
          />

          <button onClick={askAI} style={primaryButton}>
            Ask AI
          </button>

          {chatReply && (
            <div style={darkMode ? darkInsightCard : insightCard}>
              {chatReply}
            </div>
          )}

          <div
            style={{
              marginTop: "15px",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              style={secondaryButton}
              onClick={() => setChatMessage("Which products should I restock?")}
            >
              Restock Advice
            </button>

            <button
              style={secondaryButton}
              onClick={() => setChatMessage("What is my revenue?")}
            >
              Revenue
            </button>

            <button
              style={secondaryButton}
              onClick={() => setChatMessage("What is my best selling product?")}
            >
              Best Seller
            </button>

            <button
              style={secondaryButton}
              onClick={() => setChatMessage("Give business advice")}
            >
              Business Advice
            </button>
          </div>
        </section>

        <section style={darkMode ? darkPanel : panel}>
          <h2>💰 Sales History</h2>

          {sales.length === 0 ? (
            <p style={darkMode ? darkMutedText : mutedText}>No sales yet.</p>
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
  background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #fdf2f8 100%)",
  fontFamily: "Inter, Arial",
};

const darkAppShell = {
  display: "flex",
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, #1e1b4b, #020617 45%, #000000)",
  fontFamily: "Inter, Arial",
  color: "#e5e7eb",
};

const sidebar = {
  width: "260px",
  background: "linear-gradient(180deg, #020617 0%, #111827 55%, #1e1b4b 100%)",
  color: "white",
  padding: "24px",
  position: "fixed" as const,
  height: "100vh",
  borderRight: "1px solid rgba(255,255,255,0.08)",
};

const mainContent = {
  marginLeft: "308px",
  padding: "36px",
  width: "100%",
};

const brand = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
  marginBottom: "42px",
};

const brandIcon = {
  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
  padding: "16px",
  borderRadius: "20px",
  fontSize: "26px",
  boxShadow: "0 18px 40px rgba(37,99,235,0.35)",
};

const navBox = {
  display: "grid",
  gap: "10px",
};

const navItem = {
  padding: "13px",
  color: "#cbd5e1",
  borderRadius: "14px",
};

const navItemActive = {
  padding: "13px",
  background: "rgba(255,255,255,0.12)",
  borderRadius: "14px",
};

const logoutButton = {
  marginTop: "40px",
  padding: "13px",
  width: "100%",
  border: "none",
  borderRadius: "16px",
  cursor: "pointer",
  background: "rgba(255,255,255,0.12)",
  color: "white",
};

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "30px",
};

const eyebrow = {
  color: "#2563eb",
  fontWeight: "bold",
  margin: 0,
};

const heroTitle = {
  fontSize: "48px",
  margin: "6px 0",
  letterSpacing: "-1.5px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "18px",
  marginBottom: "26px",
};

const statCard = {
  padding: "24px",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 22px 45px rgba(15,23,42,0.10)",
};

const twoColumn = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "24px",
  marginBottom: "26px",
};

const panel = {
  background: "rgba(255,255,255,0.82)",
  backdropFilter: "blur(18px)",
  padding: "28px",
  borderRadius: "30px",
  border: "1px solid rgba(255,255,255,0.7)",
  marginBottom: "28px",
  boxShadow: "0 24px 60px rgba(15,23,42,0.10)",
};

const darkPanel = {
  background: "rgba(15,23,42,0.82)",
  backdropFilter: "blur(18px)",
  padding: "28px",
  borderRadius: "30px",
  border: "1px solid rgba(148,163,184,0.18)",
  marginBottom: "28px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
};

const inputStyle = {
  padding: "13px 15px",
  border: "1px solid #d1d5db",
  borderRadius: "16px",
  marginBottom: "10px",
  outline: "none",
};

const primaryButton = {
  padding: "13px 20px",
  background: "linear-gradient(135deg, #111827, #2563eb)",
  color: "white",
  border: "none",
  borderRadius: "16px",
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(37,99,235,0.28)",
};

const secondaryButton = {
  padding: "12px 18px",
  background: "linear-gradient(135deg, #2563eb, #7c3aed)",
  color: "white",
  border: "none",
  borderRadius: "16px",
  cursor: "pointer",
};

const successButton = {
  padding: "11px 15px",
  background: "linear-gradient(135deg, #16a34a, #22c55e)",
  color: "white",
  border: "none",
  borderRadius: "15px",
  cursor: "pointer",
  marginRight: "8px",
};

const invoiceButton = {
  padding: "11px 15px",
  background: "linear-gradient(135deg, #2563eb, #06b6d4)",
  color: "white",
  border: "none",
  borderRadius: "15px",
  cursor: "pointer",
};

const mutedText = {
  color: "#64748b",
};

const darkMutedText = {
  color: "#94a3b8",
};

const smallMuted = {
  color: "#94a3b8",
  margin: "0 0 8px 0",
  fontSize: "14px",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const productGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "18px",
};

const productCard = {
  padding: "20px",
  borderRadius: "24px",
  border: "1px solid rgba(226,232,240,0.9)",
  background: "rgba(255,255,255,0.75)",
  boxShadow: "0 18px 35px rgba(15,23,42,0.08)",
};

const darkProductCard = {
  padding: "20px",
  borderRadius: "24px",
  border: "1px solid #1e293b",
  background: "rgba(17,24,39,0.85)",
};

const saleRow = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 2fr",
  padding: "15px",
  borderBottom: "1px solid #e5e7eb",
};

const insightCard = {
  padding: "16px",
  marginBottom: "12px",
  borderRadius: "18px",
  background: "rgba(248,250,252,0.9)",
  border: "1px solid #e2e8f0",
};

const darkInsightCard = {
  padding: "16px",
  marginBottom: "12px",
  borderRadius: "18px",
  background: "rgba(17,24,39,0.9)",
  border: "1px solid #1e293b",
};

const authPage = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "radial-gradient(circle at top left, #2563eb, #020617 55%, #000)",
};

const authCard = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(18px)",
  padding: "40px",
  borderRadius: "30px",
  maxWidth: "430px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
};

const logoBox = {
  fontSize: "44px",
};

const authTitle = {
  fontSize: "38px",
  margin: "8px 0",
};

const forecastCard = (risk: string) => ({
  padding: "16px",
  borderRadius: "20px",
  marginBottom: "14px",
  background:
    risk === "High" ? "#fef2f2" : risk === "Medium" ? "#fffbeb" : "#ecfdf5",
  border: "1px solid #e5e7eb",
  boxShadow: "0 14px 28px rgba(15,23,42,0.06)",
});

const badge = (risk: string) => ({
  display: "inline-block",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
  background:
    risk === "High" ? "#dc2626" : risk === "Medium" ? "#f59e0b" : "#16a34a",
  color: "white",
});
