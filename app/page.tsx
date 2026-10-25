import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { 
  MessageSquare, 
  Users, 
  MessageCircle, 
  ShieldCheck, 
  Terminal, 
  Database, 
  ExternalLink,
  Sparkles,
  Bot
} from "lucide-react";

export const revalidate = 0; // Dynamic server rendering

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 1. Fetch live metrics and counts
  const [
    messagesRes,
    contactsRes,
    chatsRes,
    sessionRes,
    recentMessagesRes,
    contactsListRes
  ] = await Promise.all([
    supabase.from("whatsapp_messages").select("*", { count: "exact", head: true }),
    supabase.from("whatsapp_contacts").select("*", { count: "exact", head: true }),
    supabase.from("whatsapp_chats").select("*", { count: "exact", head: true }),
    supabase.from("whatsapp_auth_creds").select("session_id, updated_at").limit(1).maybeSingle(),
    supabase.from("whatsapp_messages").select("*").order("timestamp", { ascending: false }).limit(20),
    supabase.from("whatsapp_contacts").select("*").order("updated_at", { ascending: false }).limit(15)
  ]);

  const totalMessages = messagesRes.count ?? 0;
  const totalContacts = contactsRes.count ?? 0;
  const totalChats = chatsRes.count ?? 0;
  const activeSession = sessionRes.data;
  const recentMessages = recentMessagesRes.data || [];
  const contactsList = contactsListRes.data || [];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "32px 24px", width: "100%" }}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <header style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "36px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(37, 211, 102, 0.3)"
          }}>
            <Bot size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em" }}>
              KotlerX WhatsApp Center
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              Baileys Engine <span style={{ color: "var(--border-subtle)" }}>•</span> Supabase Cloud Persistence
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "rgba(37, 211, 102, 0.1)",
            border: "1px solid rgba(37, 211, 102, 0.3)",
            borderRadius: "9999px",
            fontSize: "13px",
            fontWeight: "600",
            color: "#25D366"
          }}>
            <span className="live-indicator" />
            <span>{activeSession ? "Session Synchronized" : "Waiting for Pairing"}</span>
          </div>

          <a
            href="https://supabase.com/dashboard/project/ytledgcmvsdjyezkdopb"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "9999px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              textDecoration: "none"
            }}
          >
            <Database size={15} />
            <span>Supabase Console</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </header>

      {/* ── KPI Stat Cards ─────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "20px",
        marginBottom: "36px"
      }}>
        {/* Messages Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>Logged Messages</span>
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(37, 211, 102, 0.15)", color: "#25D366" }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "800", color: "#f8fafc" }}>
            {totalMessages.toLocaleString()}
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Real-time ingress and outgoing logs
          </p>
        </div>

        {/* Contacts Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>Synced Contacts</span>
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(6, 182, 212, 0.15)", color: "#06b6d4" }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "800", color: "#f8fafc" }}>
            {totalContacts.toLocaleString()}
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Phone numbers and profile metadata
          </p>
        </div>

        {/* Active Chats Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>Active Chats</span>
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}>
              <MessageCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: "32px", fontWeight: "800", color: "#f8fafc" }}>
            {totalChats.toLocaleString()}
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            Direct threads and group conversations
          </p>
        </div>

        {/* Session Card */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)" }}>Signal Auth Engine</span>
            <div style={{ padding: "8px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#f8fafc" }}>
            {activeSession ? "Encrypted & Bound" : "Ready to Link"}
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
            {activeSession ? `ID: ${activeSession.session_id}` : "Start bot with 'npm run bot'"}
          </p>
        </div>
      </div>

      {/* ── Main Dashboard Content Columns ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* Left Column: Live Message Feed */}
        <section className="glass-panel" style={{ padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>Live Message Ingestion</h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Latest 20 messages synced directly from WhatsApp WebSocket
              </p>
            </div>
            <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.06)", color: "var(--text-secondary)" }}>
              Auto-saved
            </span>
          </div>

          {recentMessages.length === 0 ? (
            <div style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "rgba(0, 0, 0, 0.2)",
              borderRadius: "12px",
              border: "1px dashed var(--border-subtle)"
            }}>
              <MessageSquare size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-secondary)" }}>No messages recorded yet</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                Run <code style={{ color: "#25D366" }}>npm run bot</code> in your terminal and send a message to your WhatsApp bot!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentMessages.map((msg: any) => {
                const isFromMe = msg.from_me;
                const formattedTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={`${msg.chat_id}_${msg.id}`}
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      background: isFromMe ? "rgba(37, 211, 102, 0.05)" : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${isFromMe ? "rgba(37, 211, 102, 0.2)" : "rgba(255, 255, 255, 0.05)"}`,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px"
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: isFromMe ? "#25D366" : "#f8fafc" }}>
                          {isFromMe ? "Bot (You)" : (msg.push_name || msg.sender_id?.split("@")[0] || "User")}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>• {formattedTime}</span>
                        <span style={{
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(255, 255, 255, 0.08)",
                          color: "var(--text-secondary)",
                          textTransform: "uppercase"
                        }}>
                          {msg.message_type}
                        </span>
                      </div>
                      <p style={{ fontSize: "14px", color: "var(--text-primary)", wordBreak: "break-word" }}>
                        {msg.content || "[Empty or Media Message]"}
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between" }}>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: msg.status === "read" ? "#06b6d4" : msg.status === "delivered" ? "#25D366" : "var(--text-muted)",
                        textTransform: "capitalize"
                      }}>
                        {msg.status || "Received"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Contacts & Bot Commands */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Quick Bot Commands Card */}
          <section className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ padding: "6px", borderRadius: "8px", background: "rgba(37, 211, 102, 0.15)", color: "#25D366" }}>
                <Terminal size={16} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Bot Commands</h3>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(0, 0, 0, 0.25)", border: "1px solid var(--border-subtle)" }}>
                <code style={{ color: "#25D366", fontWeight: "600" }}>!ping</code>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Check bot roundtrip WebSocket latency</p>
              </div>

              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(0, 0, 0, 0.25)", border: "1px solid var(--border-subtle)" }}>
                <code style={{ color: "#25D366", fontWeight: "600" }}>!status</code>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Uptime, Node.js memory & Supabase health</p>
              </div>

              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(0, 0, 0, 0.25)", border: "1px solid var(--border-subtle)" }}>
                <code style={{ color: "#25D366", fontWeight: "600" }}>!ai &lt;question&gt;</code>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Cloudflare Workers AI Llama 3.1 text reply</p>
              </div>

              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(0, 0, 0, 0.25)", border: "1px solid var(--border-subtle)" }}>
                <code style={{ color: "#25D366", fontWeight: "600" }}>!image &lt;prompt&gt;</code>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Cloudflare SDXL photorealistic image generator</p>
              </div>

              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(0, 0, 0, 0.25)", border: "1px solid var(--border-subtle)" }}>
                <code style={{ color: "#25D366", fontWeight: "600" }}>!poll Q | Opt 1 | Opt 2</code>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Dispatches native WhatsApp encrypted poll</p>
              </div>

              <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(0, 0, 0, 0.25)", border: "1px solid var(--border-subtle)" }}>
                <code style={{ color: "#25D366", fontWeight: "600" }}>!stats</code>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Query live database counts from WhatsApp</p>
              </div>
            </div>
          </section>

          {/* Synced Contacts Directory */}
          <section className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "6px", borderRadius: "8px", background: "rgba(6, 182, 212, 0.15)", color: "#06b6d4" }}>
                  <Users size={16} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Synced Contacts</h3>
              </div>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{totalContacts} total</span>
            </div>

            {contactsList.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", padding: "16px" }}>
                Contacts will sync automatically when WhatsApp connects.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "380px", overflowY: "auto" }}>
                {contactsList.map((contact: any) => (
                  <div
                    key={contact.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid var(--border-subtle)"
                    }}
                  >
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #128C7E 0%, #075E54 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "14px",
                      color: "#ffffff"
                    }}>
                      {(contact.name || contact.notify_name || contact.phone_number || "?")[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {contact.name || contact.notify_name || "Unknown"}
                      </p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        +{contact.phone_number || contact.id?.split("@")[0]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
