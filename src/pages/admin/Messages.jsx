import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function Messages() {
  const { member, loading: authLoading } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMessages() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("contact_messages")
      .select(`
        id,
        name,
        phone,
        email,
        subject,
        message,
        is_read,
        created_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
      setMessages([]);
    } else {
      setMessages(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) {
      loadMessages();
    }
  }, [authLoading]);

  async function toggleRead(message) {
    const { error } = await supabase
      .from("contact_messages")
      .update({
        is_read: !message.is_read,
      })
      .eq("id", message.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === message.id
          ? {
              ...item,
              is_read: !message.is_read,
            }
          : item
      )
    );
  }

  function formatDate(date) {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (authLoading || loading) {
    return (
      <div className="admin-loading">
        Loading messages...
      </div>
    );
  }

  if (
    member?.role !== "admin" &&
    member?.role !== "secretary"
  ) {
    return (
      <div className="admin-access-denied">
        <div>
          <h1>Access denied</h1>
          <p>
            Only administrators and secretaries can view messages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">

      <div className="admin-page-heading">

        <div>
          <p className="section-label">
            COMMUNITY
          </p>

          <h1>
            Contact Messages
          </h1>

          <p>
            Messages submitted through the public website.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadMessages}
        >
          ↻ Refresh
        </button>

      </div>

      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}

      <div className="messages-list">

        {messages.length === 0 ? (

          <div className="admin-empty-card">
            <h3>
              No messages
            </h3>

            <p>
              Messages from the public will appear here.
            </p>
          </div>

        ) : (

          messages.map((message) => (

            <article
              className={
                message.is_read
                  ? "message-card read"
                  : "message-card unread"
              }
              key={message.id}
            >

              <div className="message-card-top">

                <div>

                  <span
                    className={
                      message.is_read
                        ? "content-status draft"
                        : "content-status published"
                    }
                  >
                    {message.is_read
                      ? "Read"
                      : "New"}
                  </span>

                  <h2>
                    {message.subject}
                  </h2>

                </div>

                <span className="message-date">
                  {formatDate(message.created_at)}
                </span>

              </div>


              <div className="message-sender">

                <strong>
                  {message.name}
                </strong>

                {message.phone && (
                  <span>
                    {message.phone}
                  </span>
                )}

                {message.email && (
                  <span>
                    {message.email}
                  </span>
                )}

              </div>


              <p className="message-body">
                {message.message}
              </p>


              <div className="message-footer">

                <button
                  className="content-action"
                  onClick={() =>
                    toggleRead(message)
                  }
                >
                  {message.is_read
                    ? "Mark as unread"
                    : "Mark as read"}
                </button>

              </div>

            </article>

          ))

        )}

      </div>

    </div>
  );
}

export default Messages;