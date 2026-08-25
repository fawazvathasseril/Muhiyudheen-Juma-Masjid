import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";


function AuditLogs() {

  const [logs, setLogs] =
    useState([]);


  const [loading, setLoading] =
    useState(true);


  const [error, setError] =
    useState("");


  /* ========================================
     LOAD AUDIT LOGS
  ======================================== */

  async function loadLogs() {

    setLoading(true);
    setError("");


    const {
      data,
      error,
    } =
      await supabase
        .from("audit_logs")
        .select(`
          id,
          action,
          transaction_id,
          user_id,
          old_data,
          new_data,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


    if (error) {

      setError(
        error.message
      );

      setLogs([]);

    } else {

      setLogs(
        data || []
      );
    }


    setLoading(false);
  }


  useEffect(() => {

    loadLogs();

  }, []);


  /* ========================================
     FORMAT DATE
  ======================================== */

  function formatDate(
    date
  ) {

    return new Date(
      date
    ).toLocaleString(
      "en-IN",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    );
  }


  /* ========================================
     FORMAT ACTION LABEL
  ======================================== */

  function actionLabel(
    action
  ) {

    switch (action) {

      case "created":
        return "Created";


      case "updated":
        return "Updated";


      case "deleted":
        return "Deleted";


      case "receipt_added":
        return "Receipt Added";


      case "receipt_removed":
        return "Receipt Removed";


      default:
        return action;
    }
  }


  /* ========================================
     ACTION CLASS
  ======================================== */

  function actionClass(
    action
  ) {

    switch (action) {

      case "created":
        return "audit-action-created";


      case "updated":
        return "audit-action-updated";


      case "deleted":
        return "audit-action-deleted";


      case "receipt_added":
        return "audit-action-receipt_added";


      case "receipt_removed":
        return "audit-action-receipt_removed";


      default:
        return "audit-action-default";
    }
  }


  /* ========================================
     PAGE
  ======================================== */

  return (
    <div className="audit-page">


      {/* ==================================
          HEADER
      ================================== */}

      <div className="admin-page-heading">

        <div>

          <p className="section-label">
            SECURITY
          </p>


          <h1>
            Audit Log
          </h1>


          <p>
            History of financial record changes.
          </p>

        </div>


        <button
          type="button"
          className="secondary-button"
          onClick={
            loadLogs
          }
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
          AUDIT CARD
      ================================== */}

      <div className="audit-card">

        {loading ? (

          <div className="table-loading">
            Loading audit history...
          </div>

        ) : logs.length === 0 ? (

          <div className="table-empty">

            <h3>
              No audit entries yet
            </h3>


            <p>
              Financial changes will appear here.
            </p>

          </div>

        ) : (

          <div className="audit-list">

            {logs.map(
              (log) => (

                <div
                  className="audit-row"
                  key={
                    log.id
                  }
                >


                  {/* ACTION */}

                  <div className="audit-action">

                    <span
                      className={`audit-action-badge ${actionClass(
                        log.action
                      )}`}
                    >
                      {
                        actionLabel(
                          log.action
                        )
                      }
                    </span>

                  </div>


                  {/* INFORMATION */}

                  <div className="audit-info">

                    <strong>
                      Transaction activity
                    </strong>


                    <span>
                      Transaction:
                      {" "}

                      {
                        log.transaction_id ||
                        "N/A"
                      }
                    </span>


                    <small>
                      {
                        formatDate(
                          log.created_at
                        )
                      }
                    </small>

                  </div>


                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}


export default AuditLogs;