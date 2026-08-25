import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { siteConfig } from "../config/siteConfig";

function Contact() {

  const [form, setForm] = useState({
  name: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
});

const [sending, setSending] = useState(false);
const [success, setSuccess] = useState("");
const [error, setError] = useState("");

function handleChange(event) {
  const { name, value } = event.target;

  setForm((current) => ({
    ...current,
    [name]: value,
  }));
}

async function handleSubmit(event) {
  event.preventDefault();

  setSuccess("");
  setError("");

  if (!form.name.trim()) {
    setError("Please enter your name.");
    return;
  }

  if (!form.subject.trim()) {
    setError("Please enter a subject.");
    return;
  }

  if (!form.message.trim()) {
    setError("Please enter your message.");
    return;
  }

  setSending(true);

  const { error } = await supabase
    .from("contact_messages")
    .insert({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      subject: form.subject.trim(),
      message: form.message.trim(),
    });

  setSending(false);

  if (error) {
    setError(error.message);
    return;
  }

  setSuccess(
    "Your message has been sent successfully. The Mahal Committee will get back to you."
  );

  setForm({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });
}

  return (
    <div className="contact-page">

      <section className="page-hero">
        <div className="container">

          <p className="section-label">
            GET IN TOUCH
          </p>

          <h1>Contact Us</h1>

          <p>
            Have a question or need to reach the Mahal
            Committee? We're here to help.
          </p>

        </div>
      </section>


      <section className="contact-section">

        <div className="container contact-grid">

          {/* Contact details */}

          <div className="contact-details">

            <p className="section-label">
              MAHAL OFFICE
            </p>

            <h2>
              We'd love to hear from you.
            </h2>

            <p>
              For questions regarding the Masjid, programs,
              donations or community welfare, you can contact
              the Mahal office or reach out to the committee.
            </p>


            <div className="contact-item">

              <span>📍</span>

              <div>
                <strong>
                  Address
                </strong>

                <p>
  {siteConfig.name}
  <br />
  {siteConfig.location.address}
  <br />
  {siteConfig.location.city},{" "}
  {siteConfig.location.district}
  <br />
  {siteConfig.location.state},{" "}
  {siteConfig.location.country}
</p>
              </div>

            </div>


            <div className="contact-item">

              <span>📞</span>

              <div>
                <strong>
                  Phone
                </strong>

                <p>
  {siteConfig.contact.phone}
</p>

              </div>

            </div>


            <div className="contact-item">

              <span>✉️</span>

              <div>

                <strong>
                  Email
                </strong>

               <p>
  {siteConfig.contact.email}
</p>

              </div>

            </div>

          </div>


          {/* Contact form */}

          <div className="contact-form">

            <h2>
              Send us a message
            </h2>

            <p>
              Fill in the form and the committee can get
              back to you.
            </p>


           <form onSubmit={handleSubmit}>

              <div className="form-row">

                <div className="form-field">

                  <label>
                    Your name
                  </label>

                  <input
  type="text"
  name="name"
  value={form.name}
  onChange={handleChange}
  placeholder="Enter your name"
  required
/>

                </div>


                <div className="form-field">

                  <label>
                    Phone
                  </label>

                  <input
  type="tel"
  name="phone"
  value={form.phone}
  onChange={handleChange}
  placeholder="+91 XXXXX XXXXX"
/>

                </div>

              </div>


              <div className="form-field">

                <label>
                  Email
                </label>

                <input
  type="email"
  name="email"
  value={form.email}
  onChange={handleChange}
  placeholder="your@email.com"
/>

              </div>


              <div className="form-field">

                <label>
                  Subject
                </label>

                <input
  type="text"
  name="subject"
  value={form.subject}
  onChange={handleChange}
  placeholder="What is this regarding?"
  required
/>

              </div>


              <div className="form-field">

                <label>
                  Message
                </label>

                <textarea
  name="message"
  value={form.message}
  onChange={handleChange}
  rows="5"
  placeholder="Write your message..."
  required
/>

              </div>

{error && (
  <div className="form-message error">
    {error}
  </div>
)}

{success && (
  <div className="form-message success">
    {success}
  </div>
)}

              <button
  type="submit"
  className="primary-button"
  disabled={sending}
>
  {sending ? "Sending..." : "Send Message"}
</button>

            </form>

          </div>

        </div>

      </section>


      {/* Map placeholder */}

      <section className="map-section">

        <div className="container">

          <div className="map-placeholder">

            <a
  href={siteConfig.maps.googleMapsUrl}
  target="_blank"
  rel="noreferrer"
  className="map-placeholder"
>
  <span>📍</span>

  <h3>Find Our Masjid</h3>

  <p>Open location in Google Maps →</p>
</a>

          </div>

        </div>

      </section>


      <section className="contact-bottom">

        <Link
          to="/"
          className="secondary-button"
        >
          ← Back to Home
        </Link>

      </section>

    </div>
  );
}

export default Contact;