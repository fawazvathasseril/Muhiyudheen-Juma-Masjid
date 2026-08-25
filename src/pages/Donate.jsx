import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { siteConfig } from "../config/siteConfig";

function Donate() {
  const [funds, setFunds] = useState([]);

  const [loadingFunds, setLoadingFunds] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const [form, setForm] = useState({
    contributorType: "external",

    contributorName: "",
    phone: "",
    email: "",

    fundId: "",

    amount: "",

    paymentMethod: "upi",

    referenceNumber: "",

    message: "",
  });


  useEffect(() => {
    async function loadFunds() {
      const { data, error } =
        await supabase
          .from("funds")
          .select("id, name")
          .eq("is_active", true)
          .order("name");

      if (error) {
        setError(
          "Unable to load funds."
        );
      } else {
        setFunds(data || []);

        if (data?.length > 0) {
          setForm((current) => ({
            ...current,
            fundId:
              current.fundId ||
              data[0].id,
          }));
        }
      }

      setLoadingFunds(false);
    }

    loadFunds();
  }, []);


  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }


  function handleContributorTypeChange(
    event
  ) {
    setForm((current) => ({
      ...current,
      contributorType:
        event.target.value,

      contributorName: "",
      phone: "",
      email: "",
    }));
  }


  async function handleSubmit(event) {
    event.preventDefault();

    setSuccess("");
    setError("");

    const amount =
      Number(form.amount);

    if (!form.fundId) {
      setError(
        "Please select a fund."
      );
      return;
    }

    if (!amount || amount <= 0) {
      setError(
        "Please enter a valid amount."
      );
      return;
    }

    if (
      form.contributorType ===
        "external" &&
      !form.contributorName.trim()
    ) {
      setError(
        "Please enter your name."
      );
      return;
    }

    setSubmitting(true);

    const { error } =
      await supabase
        .from("donation_requests")
        .insert({
          contributor_type:
            form.contributorType,

          mahall_member_code: null,

          contributor_name:
            form.contributorType ===
              "anonymous"
              ? "Anonymous"
              : form.contributorName
                  .trim(),

          phone:
            form.phone.trim() ||
            null,

          email:
            form.email.trim() ||
            null,

          fund_id:
            form.fundId,

          amount,

          payment_method:
            form.paymentMethod,

          reference_number:
            form.referenceNumber
              .trim() || null,

          message:
            form.message.trim() ||
            null,

          status: "pending",
        });


    setSubmitting(false);


    if (error) {
      setError(
        error.message
      );
      return;
    }


    setSuccess(
      "Your contribution has been submitted successfully. The Mahal Committee will verify it shortly."
    );


    setForm({
      contributorType: "external",

      contributorName: "",
      phone: "",
      email: "",

      fundId:
        funds[0]?.id || "",

      amount: "",

      paymentMethod: "upi",

      referenceNumber: "",

      message: "",
    });
  }


  if (loadingFunds) {
    return (
      <div className="donate-page">

        <section className="page-hero">

          <div className="container">

            <p className="section-label">
              SUPPORT OUR MAHAL
            </p>

            <h1>
              Donate
            </h1>

            <p>
              Loading contribution options...
            </p>

          </div>

        </section>

      </div>
    );
  }


  return (
    <div className="donate-page">

      {/* =========================
          HERO
      ========================== */}

      <section className="page-hero">

        <div className="container">

          <p className="section-label">
            SUPPORT OUR MAHAL
          </p>

          <h1>
            Make a Contribution
          </h1>

          <p>
            Your contribution helps support the Masjid,
            education, welfare and community activities.
          </p>

        </div>

      </section>


      <section className="donation-form-section">

        <div className="container donate-layout">

          {/* =========================
              FORM
          ========================== */}

          <div className="donate-form-card">

            <h2>
              Contribution Details
            </h2>

            <p className="donate-form-intro">
              Make your payment using the details provided,
              then submit the contribution information below.
              The Mahal Committee will verify it before
              adding it to the official accounts.
            </p>


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


            <form
              onSubmit={handleSubmit}
            >

              {/* Contributor Type */}

              <div className="form-field">

                <label>
                  Contributor Type
                </label>

                <select
                  value={
                    form.contributorType
                  }
                  onChange={
                    handleContributorTypeChange
                  }
                >

                  <option value="external">
                    External Contributor
                  </option>

                  <option value="anonymous">
                    Anonymous
                  </option>

                </select>

              </div>


              {/* External Contributor */}

              {form.contributorType ===
                "external" && (

                <div className="form-field">

                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="contributorName"
                    value={
                      form.contributorName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Your full name"
                    required
                  />

                </div>

              )}


              {/* Anonymous */}

              {form.contributorType ===
                "anonymous" && (

                <div className="anonymous-note">

                  <strong>
                    Anonymous Contribution
                  </strong>

                  <p>
                    Your contribution will be recorded
                    without linking it to a personal
                    contributor profile.
                  </p>

                </div>

              )}


              {/* Contact */}

              <div className="donate-contact-grid">

                <div className="form-field">

                  <label>
                    Phone
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={
                      form.phone
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="+91 XXXXX XXXXX"
                  />

                </div>


                <div className="form-field">

                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      form.email
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Optional"
                  />

                </div>

              </div>


              {/* Fund */}

              <div className="form-field">

                <label>
                  Fund
                </label>

                <select
                  name="fundId"
                  value={
                    form.fundId
                  }
                  onChange={
                    handleChange
                  }
                  required
                >

                  <option value="">
                    Select fund
                  </option>

                  {funds.map(
                    (fund) => (
                      <option
                        key={fund.id}
                        value={fund.id}
                      >
                        {fund.name}
                      </option>
                    )
                  )}

                </select>

              </div>


              {/* Amount */}

              <div className="form-field">

                <label>
                  Amount
                </label>

                <div className="currency-input">

                  <span>
                    ₹
                  </span>

                  <input
                    type="number"
                    name="amount"
                    value={
                      form.amount
                    }
                    onChange={
                      handleChange
                    }
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />

                </div>

              </div>


              {/* Payment method */}

              <div className="form-field">

                <label>
                  Payment Method
                </label>

                <select
                  name="paymentMethod"
                  value={
                    form.paymentMethod
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="upi">
                    UPI
                  </option>

                  <option value="bank_transfer">
                    Bank Transfer
                  </option>

                  <option value="cash">
                    Cash
                  </option>

                  <option value="cheque">
                    Cheque
                  </option>

                  <option value="other">
                    Other
                  </option>

                </select>

              </div>


              {/* Reference */}

              <div className="form-field">

                <label>
                  Transaction / Reference Number
                </label>

                <input
                  type="text"
                  name="referenceNumber"
                  value={
                    form.referenceNumber
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Optional"
                />

              </div>


              {/* Message */}

              <div className="form-field">

                <label>
                  Note
                </label>

                <textarea
                  name="message"
                  value={
                    form.message
                  }
                  onChange={
                    handleChange
                  }
                  rows="4"
                  placeholder="Optional message"
                />

              </div>


              <button
                type="submit"
                className="primary-button donate-submit-button"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Contribution"}
              </button>

            </form>

          </div>


          {/* =========================
              PAYMENT INFORMATION
          ========================== */}

          <aside className="donate-info-card">

            <span className="donate-info-icon">
              ₹
            </span>

            <h2>
              How it works
            </h2>


            <div className="donate-steps">

              <div>
                <strong>
                  1
                </strong>

                <p>
                  Choose the fund you would like to support.
                </p>
              </div>


              <div>
                <strong>
                  2
                </strong>

                <p>
                  Make your payment using UPI or Bank Transfer
                  using the official details below.
                </p>
              </div>


              <div>
                <strong>
                  3
                </strong>

                <p>
                  Enter your payment reference and submit
                  the contribution details.
                </p>
              </div>


              <div>
                <strong>
                  4
                </strong>

                <p>
                  The Mahal Committee verifies the payment
                  before adding it to the official accounts.
                </p>
              </div>

            </div>


            {/* UPI */}

            <div className="donate-payment-block">

              <span className="donate-payment-label">
                UPI
              </span>

              <strong>
                {siteConfig.donation.upiNumber}
              </strong>

              <p>
                Send your contribution to this official
                UPI number.
              </p>

            </div>


            {/* Bank */}

            <div className="donate-payment-block">

              <span className="donate-payment-label">
                BANK TRANSFER
              </span>

              <div className="bank-detail-row">
                <span>
                  Bank
                </span>

                <strong>
                  {siteConfig.donation.bankName}
                </strong>
              </div>

              <div className="bank-detail-row">
                <span>
                  Account Name
                </span>

                <strong>
                  {siteConfig.donation.accountName}
                </strong>
              </div>

              <div className="bank-detail-row">
                <span>
                  Account Number
                </span>

                <strong>
                  {siteConfig.donation.accountNumber}
                </strong>
              </div>

              <div className="bank-detail-row">
                <span>
                  IFSC
                </span>

                <strong>
                  {siteConfig.donation.ifsc}
                </strong>
              </div>

            </div>


            {/* QR */}

            <div className="donate-qr-block">

              <span className="donate-payment-label">
                SCAN TO PAY
              </span>

              <img
                src={siteConfig.donation.qrCode}
                alt="Official donation QR code"
                className="donation-qr"
              />

              <p>
                Scan the official QR code to make
                your contribution.
              </p>

            </div>


            <div className="donate-payment-note">

              <strong>
                Important
              </strong>

              <p>
                Please use only the official payment
                details shown on this page. The website
                records your contribution details for
                verification; it does not process the
                payment itself.
              </p>

            </div>


            <Link
              to="/funds"
              className="donate-info-link"
            >
              View fund transparency →
            </Link>

          </aside>

        </div>

      </section>

    </div>
  );
}

export default Donate;