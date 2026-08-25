import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

function DonationRequests() {
  const {
    member,
    loading: authLoading,
  } = useAuth();

  // ========================================
  // STATE
  // ========================================

  const [requests, setRequests] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState(false);

  const [confirmingRequest, setConfirmingRequest] =
    useState(null);

  const [rejectingRequest, setRejectingRequest] =
    useState(null);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  // Which reviewed cards are expanded
  const [expandedRequests, setExpandedRequests] =
    useState({});


  // ========================================
  // LOAD REQUESTS
  // ========================================

  async function loadRequests() {
    setLoading(true);
    setError("");

    const { data, error } =
      await supabase
        .from("donation_requests")
        .select(`
          id,
          contributor_type,
          mahall_member_code,
          contributor_name,
          phone,
          email,
          amount,
          payment_method,
          reference_number,
          message,
          status,
          created_at,
          reviewed_at,
          rejection_reason,
          funds (
            id,
            name
          )
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      setError(error.message);
      setRequests([]);
      setLoading(false);
      return;
    }

    // Pending first.
    // Within each status, newest first.
    const sortedRequests = [
      ...(data || []),
    ].sort((a, b) => {
      const statusOrder = {
        pending: 0,
        confirmed: 1,
        rejected: 2,
      };

      const statusDifference =
        (statusOrder[a.status] ?? 99) -
        (statusOrder[b.status] ?? 99);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return (
        new Date(b.created_at) -
        new Date(a.created_at)
      );
    });

    setRequests(sortedRequests);
    setLoading(false);
  }


  useEffect(() => {
    if (!authLoading) {
      loadRequests();
    }
  }, [authLoading]);


  // ========================================
  // FILTERED REQUESTS
  // ========================================

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") {
      return requests;
    }

    if (statusFilter === "accepted") {
      return requests.filter(
        (request) =>
          request.status === "confirmed"
      );
    }

    return requests.filter(
      (request) =>
        request.status === statusFilter
    );
  }, [
    requests,
    statusFilter,
  ]);


  // ========================================
  // EXPAND / COLLAPSE
  // ========================================

  function toggleRequest(requestId) {
    setExpandedRequests((current) => ({
      ...current,
      [requestId]:
        !current[requestId],
    }));
  }


  // ========================================
  // CONFIRM
  // ========================================

  async function confirmRequest() {
    if (!confirmingRequest) {
      return;
    }

    setActionLoading(true);
    setError("");

    const { error } =
      await supabase.rpc(
        "confirm_donation_request",
        {
          p_request_id:
            confirmingRequest.id,
        }
      );

    setActionLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setConfirmingRequest(null);

    await loadRequests();
  }


  // ========================================
  // REJECT
  // ========================================

  async function rejectRequest() {
    if (!rejectingRequest) {
      return;
    }

    setActionLoading(true);
    setError("");

    const { error } =
      await supabase.rpc(
        "reject_donation_request",
        {
          p_request_id:
            rejectingRequest.id,

          p_reason:
            rejectionReason.trim(),
        }
      );

    setActionLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setRejectingRequest(null);
    setRejectionReason("");

    await loadRequests();
  }


  // ========================================
  // FORMATTERS
  // ========================================

  function formatCurrency(amount) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(amount || 0)
    );
  }


  function formatDate(date) {
    return new Date(date).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }


  function formatPaymentMethod(method) {
    if (!method) {
      return "Not provided";
    }

    return method
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      );
  }


  function getStatusLabel(status) {
    if (status === "confirmed") {
      return "Accepted";
    }

    if (status === "rejected") {
      return "Rejected";
    }

    return "Pending";
  }


  // ========================================
  // LOADING
  // ========================================

  if (
    authLoading ||
    loading
  ) {
    return (
      <div className="admin-loading">
        Loading contribution requests...
      </div>
    );
  }


  // ========================================
  // ACCESS
  // ========================================

  if (
    member?.role !== "admin" &&
    member?.role !== "treasurer"
  ) {
    return (
      <div className="admin-access-denied">

        <div>

          <h1>
            Access denied
          </h1>

          <p>
            Only administrators and treasurers
            can review contribution requests.
          </p>

        </div>

      </div>
    );
  }


  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="donation-requests-page">

      {/* ==================================
          HEADER
      ================================== */}

      <div className="admin-page-heading">

        <div>

          <p className="section-label">
            FINANCIAL VERIFICATION
          </p>

          <h1>
            Contribution Requests
          </h1>

          <p>
            Review contributions submitted through
            the public website.
          </p>

        </div>


        <button
          type="button"
          className="secondary-button"
          onClick={loadRequests}
        >
          ↻ Refresh
        </button>

      </div>


      {/* ==================================
          ERROR
      ================================== */}

      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}


      {/* ==================================
          STATUS FILTERS
      ================================== */}

      <div className="request-status-filters">

        <button
          type="button"
          className={
            statusFilter === "all"
              ? "active"
              : ""
          }
          onClick={() =>
            setStatusFilter("all")
          }
        >
          All

          <span>
            {requests.length}
          </span>
        </button>


        <button
          type="button"
          className={
            statusFilter === "pending"
              ? "active"
              : ""
          }
          onClick={() =>
            setStatusFilter("pending")
          }
        >
          Pending

          <span>
            {
              requests.filter(
                (request) =>
                  request.status ===
                  "pending"
              ).length
            }
          </span>
        </button>


        <button
          type="button"
          className={
            statusFilter === "accepted"
              ? "active"
              : ""
          }
          onClick={() =>
            setStatusFilter("accepted")
          }
        >
          Accepted

          <span>
            {
              requests.filter(
                (request) =>
                  request.status ===
                  "confirmed"
              ).length
            }
          </span>
        </button>


        <button
          type="button"
          className={
            statusFilter === "rejected"
              ? "active"
              : ""
          }
          onClick={() =>
            setStatusFilter("rejected")
          }
        >
          Rejected

          <span>
            {
              requests.filter(
                (request) =>
                  request.status ===
                  "rejected"
              ).length
            }
          </span>
        </button>

      </div>


      {/* ==================================
          REQUEST LIST
      ================================== */}

      <div className="donation-request-list">

        {filteredRequests.length === 0 ? (

          <div className="admin-empty-card">

            <h3>
              {statusFilter === "all"
                ? "No contribution requests"
                : `No ${
                    statusFilter ===
                    "accepted"
                      ? "accepted"
                      : statusFilter
                  } contribution requests`}
            </h3>

            <p>
              {statusFilter === "all"
                ? "Public contribution submissions will appear here."
                : "There are no requests in this category."}
            </p>

          </div>

        ) : (

          filteredRequests.map(
            (request) => {

              const isPending =
                request.status ===
                "pending";

              const isExpanded =
                !!expandedRequests[
                  request.id
                ];

              return (
                <article
                  className={
                    isPending
                      ? `donation-request-card pending`
                      : `donation-request-card reviewed ${request.status}`
                  }
                  key={request.id}
                >

                  {/* ==================================
                      PENDING REQUEST
                  ================================== */}

                  {isPending ? (

                    <>

                      <div className="donation-request-header">

                        <div>

                          <span className="content-status draft">
                            Pending
                          </span>

                          <h2>
                            {formatCurrency(
                              request.amount
                            )}
                          </h2>

                        </div>


                        <span className="message-date">
                          {formatDate(
                            request.created_at
                          )}
                        </span>

                      </div>


                      <div className="donation-request-grid">

                        <div>

                          <span>
                            Contributor
                          </span>

                          <strong>
                            {request.contributor_name ||
                              "Anonymous"}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Type
                          </span>

                          <strong>
                            {request.contributor_type}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Fund
                          </span>

                          <strong>
                            {request.funds?.name ||
                              "Unknown Fund"}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Payment
                          </span>

                          <strong>
                            {formatPaymentMethod(
                              request.payment_method
                            )}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Reference
                          </span>

                          <strong>
                            {request.reference_number ||
                              "Not provided"}
                          </strong>

                        </div>


                        {request.mahall_member_code && (

                          <div>

                            <span>
                              Mahall ID
                            </span>

                            <strong>
                              {
                                request.mahall_member_code
                              }
                            </strong>

                          </div>

                        )}

                      </div>


                      {(request.phone ||
                        request.email) && (

                        <div className="donation-request-contact">

                          {request.phone && (
                            <span>
                              ☎ {request.phone}
                            </span>
                          )}

                          {request.email && (
                            <span>
                              ✉ {request.email}
                            </span>
                          )}

                        </div>

                      )}


                      {request.message && (

                        <div className="donation-request-message">

                          <span>
                            Note
                          </span>

                          <p>
                            {request.message}
                          </p>

                        </div>

                      )}


                      <div className="donation-request-actions">

                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => {
                            setRejectingRequest(
                              null
                            );

                            setConfirmingRequest(
                              request
                            );
                          }}
                        >
                          Confirm Contribution
                        </button>


                        <button
                          type="button"
                          className="member-action deactivate"
                          onClick={() => {
                            setConfirmingRequest(
                              null
                            );

                            setRejectingRequest(
                              request
                            );

                            setRejectionReason(
                              ""
                            );
                          }}
                        >
                          Reject
                        </button>

                      </div>

                    </>

                  ) : (

                    /* ==================================
                       REVIEWED REQUEST
                    ================================== */

                    <>

                      <button
                        type="button"
                        className="reviewed-request-compact"
                        onClick={() =>
                          toggleRequest(
                            request.id
                          )
                        }
                        aria-expanded={
                          isExpanded
                        }
                      >

                        <div className="reviewed-request-status">

                          <span
                            className={
                              request.status ===
                              "confirmed"
                                ? "reviewed-status accepted"
                                : "reviewed-status rejected"
                            }
                          >
                            {getStatusLabel(
                              request.status
                            )}
                          </span>

                          <strong>
                            {formatCurrency(
                              request.amount
                            )}
                          </strong>

                        </div>


                        <div className="reviewed-request-details">

                          <strong>
                            {request.contributor_name ||
                              "Anonymous"}
                          </strong>

                          <span>
                            {request.funds?.name ||
                              "Unknown Fund"}
                          </span>

                          <span>
                            {formatPaymentMethod(
                              request.payment_method
                            )}
                          </span>

                          {request.reference_number && (
                            <span>
                              Ref:{" "}
                              {
                                request.reference_number
                              }
                            </span>
                          )}

                        </div>


                        <div className="reviewed-request-date">

                          <span>
                            Reviewed
                          </span>

                          <strong>
                            {formatDate(
                              request.reviewed_at ||
                              request.created_at
                            )}
                          </strong>

                        </div>


                        <span
                          className="reviewed-request-expand-icon"
                          aria-hidden="true"
                        >
                          {isExpanded
                            ? "⌃"
                            : "⌄"}
                        </span>

                      </button>


                      {isExpanded && (

                        <div className="reviewed-request-expanded">

                          <div className="donation-request-grid">

                            <div>

                              <span>
                                Contributor
                              </span>

                              <strong>
                                {request.contributor_name ||
                                  "Anonymous"}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Type
                              </span>

                              <strong>
                                {request.contributor_type}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Fund
                              </span>

                              <strong>
                                {request.funds?.name ||
                                  "Unknown Fund"}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Payment
                              </span>

                              <strong>
                                {formatPaymentMethod(
                                  request.payment_method
                                )}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Reference
                              </span>

                              <strong>
                                {request.reference_number ||
                                  "Not provided"}
                              </strong>

                            </div>


                            {request.mahall_member_code && (

                              <div>

                                <span>
                                  Mahall ID
                                </span>

                                <strong>
                                  {
                                    request.mahall_member_code
                                  }
                                </strong>

                              </div>

                            )}

                          </div>


                          {(request.phone ||
                            request.email) && (

                            <div className="donation-request-contact">

                              {request.phone && (
                                <span>
                                  ☎ {request.phone}
                                </span>
                              )}

                              {request.email && (
                                <span>
                                  ✉ {request.email}
                                </span>
                              )}

                            </div>

                          )}


                          {request.message && (

                            <div className="donation-request-message">

                              <span>
                                Note
                              </span>

                              <p>
                                {request.message}
                              </p>

                            </div>

                          )}


                          {request.status ===
                            "rejected" &&
                            request.rejection_reason && (

                            <div className="donation-request-message rejection-note">

                              <span>
                                Rejection Reason
                              </span>

                              <p>
                                {
                                  request.rejection_reason
                                }
                              </p>

                            </div>

                          )}

                        </div>

                      )}

                    </>

                  )}

                </article>
              );
            }
          )

        )}

      </div>


      {/* ==================================
          CONFIRMATION MODAL
      ================================== */}

      {confirmingRequest && (

        <div className="donation-modal-overlay">

          <div className="donation-modal">

            <button
              type="button"
              className="donation-modal-close"
              onClick={() =>
                setConfirmingRequest(
                  null
                )
              }
              disabled={
                actionLoading
              }
            >
              ×
            </button>


            <div className="donation-modal-icon success-icon">
              ✓
            </div>


            <h2>
              Confirm Contribution?
            </h2>


            <p>
              This will add the contribution to
              the official financial records.
            </p>


            <div className="donation-modal-summary">

              <div>

                <span>
                  Amount
                </span>

                <strong>
                  {formatCurrency(
                    confirmingRequest.amount
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Contributor
                </span>

                <strong>
                  {confirmingRequest.contributor_name ||
                    "Anonymous"}
                </strong>

              </div>


              <div>

                <span>
                  Fund
                </span>

                <strong>
                  {confirmingRequest.funds?.name ||
                    "Unknown Fund"}
                </strong>

              </div>

            </div>


            <div className="donation-modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setConfirmingRequest(
                    null
                  )
                }
                disabled={
                  actionLoading
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="primary-button"
                onClick={
                  confirmRequest
                }
                disabled={
                  actionLoading
                }
              >
                {actionLoading
                  ? "Confirming..."
                  : "Confirm Contribution"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ==================================
          REJECTION MODAL
      ================================== */}

      {rejectingRequest && (

        <div className="donation-modal-overlay">

          <div className="donation-modal">

            <button
              type="button"
              className="donation-modal-close"
              onClick={() =>
                setRejectingRequest(
                  null
                )
              }
              disabled={
                actionLoading
              }
            >
              ×
            </button>


            <div className="donation-modal-icon reject-icon">
              !
            </div>


            <h2>
              Reject Contribution?
            </h2>


            <p>
              This contribution will not be added to
              the official financial records.
            </p>


            <div className="form-field modal-reason-field">

              <label>
                Reason
              </label>

              <textarea
                value={
                  rejectionReason
                }
                onChange={(event) =>
                  setRejectionReason(
                    event.target.value
                  )
                }
                rows="4"
                placeholder="Why is this contribution being rejected?"
              />

            </div>


            <div className="donation-modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setRejectingRequest(
                    null
                  )
                }
                disabled={
                  actionLoading
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="member-action deactivate"
                onClick={
                  rejectRequest
                }
                disabled={
                  actionLoading
                }
              >
                {actionLoading
                  ? "Rejecting..."
                  : "Reject Contribution"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default DonationRequests;