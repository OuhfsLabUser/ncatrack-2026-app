// src/components/SessionLogAppointments.js
import React, { useState, useEffect } from "react";
import "./SessionLogAppointments.css";
import "./MHBasicInterface.css"; // Import MH-Basic styles for consistency
import DocumentUploadSection from "./DocumentUploadSection";
import SessionLogModal from "./SessionLogModal";
import { useCase } from '../context/CaseContext';
import { mentalHealthApi } from "../services/api";

const SessionLogAppointments = () => {
  const [activeTab, setActiveTab] = useState("agenda"); // "agenda" or "calendar"
  const [calendarView, setCalendarView] = useState("month"); // "month" or "week"
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sessions, setSessions] = useState([]); // Loaded from API
  const [sessionLogModalOpen, setSessionLogModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null); // Currently editing session (passed to SessionLogModal)
  const [expandedSessionIds, setExpandedSessionIds] = useState(new Set()); // Control dropdown details for each row
  
  // Document Upload state
  const [documents, setDocuments] = useState([]); // Empty for now

  const { currentCase } = useCase();

  const resolveCaseId = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (val && typeof val === 'object' && val.case_id) {
      return val.case_id;
    }
    return null;
  };

  const caseId = resolveCaseId(currentCase);
  const cacId = currentCase && typeof currentCase === 'object' ? currentCase.cac_id || currentCase.cacId || null : null;

  // Map session_status_id -> text label (consistent with options used when creating/editing Session)
  const SESSION_STATUS_LABELS = {
    1: "Attended",
    2: "Canceled",
    3: "Canceled & Rescheduled",
    4: "Client Canceled",
    5: "Clinician Canceled",
    6: "Declined",
    7: "No-show",
    8: "Rescheduled",
    9: "To Be Scheduled"
  };

  const getStatusLabel = (statusId) => {
    if (statusId === null || statusId === undefined) return "";
    return SESSION_STATUS_LABELS[statusId] || statusId.toString();
  };

  // Map session_type_id -> text label (must be consistent with Type options in SessionLogModal)
  const SESSION_TYPE_LABELS = {
    1: "Individual Session with Dog",
    2: "Individual Talk",
    3: "Group/Support",
    4: "Session with Interpreter present",
    5: "Family",
    6: "Psycho/Social Group",
    7: "Telehealth Virtual",
    8: "Telephone Call",
  };

  const getTypeLabel = (typeId) => {
    if (typeId === null || typeId === undefined) return "";
    return SESSION_TYPE_LABELS[typeId] || typeId.toString();
  };

  // Format 24-hour time stored in backend ("HH:MM" or "HH:MM:SS") to 12-hour format with AM/PM for table display
  const formatTimeForDisplay = (value) => {
    if (!value) return "";
    try {
      const cleaned = String(value).trim();
      const parts = cleaned.split(":");
      if (parts.length < 2) return cleaned;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return cleaned;

      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(value);
    }
  };

  // Display only by "calendar date" to avoid previous day display issues caused by timezone
  const buildSessionDateParts = (value) => {
    if (!value) {
      return { dayNumber: "", weekday: "", monthYear: "" };
    }

    let year, month, day;

    try {
      if (typeof value === "string") {
        // May be "2025-12-03" or "2025-12-03T00:00:00.000Z"
        const isoDate = value.includes("T") ? value.split("T")[0] : value;
        const parts = isoDate.split("-");
        if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        }
      } else if (value instanceof Date) {
        // Prisma may directly give Date object, here split via ISO string, ignore timezone
        const iso = value.toISOString().slice(0, 10); // yyyy-MM-dd
        const parts = iso.split("-");
        if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        }
      }

      if (!year || !month || !day) {
        return { dayNumber: "", weekday: "", monthYear: "" };
      }

      // Reconstruct Date using local year/month/day, only for getting weekday and month text
      const d = new Date(year, month - 1, day);
      if (Number.isNaN(d.getTime())) {
        return { dayNumber: "", weekday: "", monthYear: "" };
      }

      const dayNumber = day.toString();
      const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
      // Consistent with old system: e.g. "November, 2025"
      const monthName = d.toLocaleDateString("en-US", { month: "long" });
      const yearStr = d.getFullYear().toString();
      const monthYear = `${monthName}, ${yearStr}`;

      return { dayNumber, weekday, monthYear };
    } catch {
      return { dayNumber: "", weekday: "", monthYear: "" };
    }
  };

  // Load all sessions (case notes) for current case from backend
  const loadSessions = async () => {
    if (!caseId) {
      setSessions([]);
      return;
    }
    try {
      const data = await mentalHealthApi.getSessionsByCaseId(caseId);
      const mapped = (data || []).map((s) => {
        const dateParts = buildSessionDateParts(s.session_date);
        return {
          id: s.case_mh_session_id,
          raw: s,
          dateParts,
          startTime: formatTimeForDisplay(s.start_time),
          endTime: formatTimeForDisplay(s.end_time),
          type: getTypeLabel(s.session_type_id),
          status: getStatusLabel(s.session_status_id),
        };
      });
      setSessions(mapped);
      setCurrentPage(0);
    } catch (err) {
      console.error("Error loading mental health sessions:", err);
      setSessions([]);
    }
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Calendar helpers
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatWeekRange = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
  };

  // Generate calendar days
  const getCalendarDays = () => {
    if (calendarView === "month") {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      const days = [];
      // Previous month's days
      const prevMonth = new Date(year, month - 1, 0);
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        days.push({
          date: prevMonth.getDate() - i,
          isCurrentMonth: false,
          fullDate: new Date(year, month - 1, prevMonth.getDate() - i)
        });
      }
      // Current month's days
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({
          date: i,
          isCurrentMonth: true,
          fullDate: new Date(year, month, i)
        });
      }
      // Next month's days to fill the grid
      const remainingDays = 42 - days.length; // 6 weeks * 7 days
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: i,
          isCurrentMonth: false,
          fullDate: new Date(year, month + 1, i)
        });
      }
      return days;
    } else {
      // Week view
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day;
      startOfWeek.setDate(diff);
      
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        days.push({
          date: date.getDate(),
          isCurrentMonth: true,
          fullDate: date,
          dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
        });
      }
      return days;
    }
  };

  const getTimeSlots = () => {
    return [
      "all day",
      "8:00 AM",
      "9:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "1:00 PM",
      "2:00 PM",
      "3:00 PM",
      "4:00 PM",
      "5:00 PM"
    ];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="mh-basic-container" data-aoi="Session Log Container">
      <div className="mh-basic-form" data-aoi="Session Log Form Container">
        {/* SESSION LOG / APPOINTMENTS SECTION */}
        <section className="mh-section" data-aoi="Session Log Section">
          <h2 data-aoi="Session Log Header">Session Log / Appointments</h2>
          
          {/* TAB SWITCHER */}
          <div className="session-log-tabs" data-aoi="Session Log Tabs">
          <button
            type="button"
            className={`session-log-tab ${activeTab === "agenda" ? "active" : ""}`}
            onClick={() => setActiveTab("agenda")}
            data-aoi="Agenda Tab"
          >
            Agenda
          </button>
          <button
            type="button"
            className={`session-log-tab ${activeTab === "calendar" ? "active" : ""}`}
            onClick={() => setActiveTab("calendar")}
            data-aoi="Calendar Tab"
          >
            Calendar
          </button>
        </div>

        {/* AGENDA VIEW */}
        {activeTab === "agenda" && (
          <div className="session-log-content" data-aoi="Agenda View">
            {/* Action Buttons */}
            <div className="session-log-actions" data-aoi="Session Log Actions">
              <div className="session-log-actions-left" data-aoi="Session Log Actions Left">
                <button
                  type="button"
                  className="session-log-button"
                  onClick={() => {
                    setEditingSession(null);
                    setSessionLogModalOpen(true);
                  }}
                  data-aoi="Add Session Log Button"
                >
                  + Add New Session Log
                </button>
                <button
                  type="button"
                  className="session-log-button"
                  onClick={() => {
                    // If all are currently expanded, collapse all; otherwise expand all
                    setExpandedSessionIds(prev => {
                      const allIds = sessions.map(s => s.id);
                      const allExpanded = allIds.length > 0 && allIds.every(id => prev.has(id));
                      if (allExpanded) {
                        return new Set(); // Collapse all
                      }
                      return new Set(allIds); // Expand all
                    });
                  }}
                  data-aoi="Details Button"
                >
                  Details
                </button>
              </div>
              <div className="session-log-actions-right" data-aoi="Session Log Actions Right">
                <button
                  type="button"
                  className="session-log-nav-button"
                  data-aoi="Newer Records Button"
                >
                  Newer Records
                </button>
                <button
                  type="button"
                  className="session-log-nav-button"
                  data-aoi="Older Records Button"
                >
                  Older Records
                </button>
              </div>
            </div>

            {/* Table */}
            <table className="session-log-table" data-aoi="Session Log Table">
              <thead data-aoi="Session Log Table Header">
                <tr>
                  <th style={{ width: '32px' }} data-aoi="Table Header Expand"></th>
                  <th data-aoi="Table Header Actions"></th>
                  <th data-aoi="Table Header Date">Date</th>
                  <th data-aoi="Table Header Start Time">Start Time</th>
                  <th data-aoi="Table Header End Time">End Time</th>
                  <th data-aoi="Table Header Type">Type</th>
                  <th data-aoi="Table Header Status">Status</th>
                </tr>
              </thead>
              <tbody data-aoi="Session Log Table Body">
                {sessions.length === 0 ? (
                  <tr data-aoi="No Items Row">
                    <td colSpan="6" className="no-items-cell" data-aoi="No Items Cell">
                      No items to display
                    </td>
                  </tr>
                ) : (
                  sessions.map((session, index) => {
                    const isExpanded = expandedSessionIds.has(session.id);
                    return (
                      <React.Fragment key={session.id ?? index}>
                        <tr data-aoi="Session Row">
                          <td data-aoi="Expand Cell">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedSessionIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(session.id)) {
                                    next.delete(session.id);
                                  } else {
                                    next.add(session.id);
                                  }
                                  return next;
                                });
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                fontSize: '0.9rem',
                              }}
                              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </td>
                      <td data-aoi="Row Actions Cell">
                        <div className="session-row-actions">
                          <button
                            type="button"
                            className="session-row-action-button"
                            onClick={() => {
                              setEditingSession(session.raw);
                              setSessionLogModalOpen(true);
                            }}
                            data-aoi="Edit Session Button"
                          >
                            🖊 Edit
                          </button>
                          <button
                            type="button"
                            className="session-row-action-button"
                            onClick={async () => {
                              if (!window.confirm("Are you sure you want to delete this session?")) {
                                return;
                              }
                              try {
                                await mentalHealthApi.deleteSession(session.id);
                                await loadSessions();
                              } catch (err) {
                                console.error("Error deleting session:", err);
                                alert("Failed to delete session.");
                              }
                            }}
                            data-aoi="Delete Session Button"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            className="session-row-action-button"
                            onClick={() => {
                              console.log("Notify Staff clicked for session", session.id);
                              // TODO: Implement Notify Staff business logic
                            }}
                            data-aoi="Notify Staff Button"
                          >
                            Notify Staff
                          </button>
                          <button
                            type="button"
                            className="session-row-action-button"
                            onClick={() => {
                              console.log("Notify Clients clicked for session", session.id);
                              // TODO: Implement Notify Clients business logic
                            }}
                            data-aoi="Notify Clients Button"
                          >
                            Notify Clients
                          </button>
                        </div>
                      </td>
                      <td data-aoi="Date Cell">
                        <div className="session-date-cell">
                          <div className="session-date-day">
                            {session.dateParts?.dayNumber || ""}
                          </div>
                          <div className="session-date-text">
                            <div className="session-date-weekday">
                              {session.dateParts?.weekday || ""}
                            </div>
                            <div className="session-date-monthyear">
                              {session.dateParts?.monthYear || ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td data-aoi="Start Time Cell">{session.startTime || "N/A"}</td>
                      <td data-aoi="End Time Cell">{session.endTime || "N/A"}</td>
                      <td data-aoi="Type Cell">{session.type || "N/A"}</td>
                      <td data-aoi="Status Cell">{session.status || "N/A"}</td>
                    </tr>
                    {isExpanded && (
                      <tr data-aoi="Session Details Row">
                        <td colSpan={7}>
                          <div
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#f9f9f9',
                              borderTop: '1px solid #e0e0e0',
                            }}
                          >
                            {/* Reference old system layout: align by two columns label/content */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                                columnGap: '24px',
                                rowGap: '4px',
                                fontSize: '0.85rem',
                              }}
                            >
                              {/* First row */}
                              <div>
                                <strong>Provider Agency</strong>
                                <div>{session.raw.cac_agency?.agency_name || ''}</div>
                              </div>
                              <div>
                                <strong>Location</strong>
                                <div>{session.raw.location_id ?? ''}</div>
                              </div>
                              <div>
                                <strong>Funding Source</strong>
                                <div>{session.raw.funding_source || ''}</div>
                              </div>
                              <div>
                                <strong>Intervention</strong>
                                <div>{session.raw.intervention_id ?? ''}</div>
                              </div>

                              {/* Second row */}
                              <div>
                                <strong>Provider</strong>
                                <div>
                                  {session.raw.employee
                                    ? `${session.raw.employee.first_name || ''} ${session.raw.employee.last_name || ''}`.trim()
                                    : ''}
                                </div>
                              </div>
                              <div>
                                <strong>Onsite</strong>
                                <div>{session.raw.onsite ? 'Yes' : 'No'}</div>
                              </div>
                              <div>
                                <strong>Suicidal Ideation</strong>
                                <div>{session.raw.suicidal_ideation || ''}</div>
                              </div>
                              <div>
                                <strong>Treatment Plan Progress</strong>
                                <div>{session.raw.treatment_plan_progress || ''}</div>
                              </div>

                              {/* Third row */}
                              <div>
                                <strong>Client Mood</strong>
                                <div>{session.raw.client_mood || ''}</div>
                              </div>
                              <div>
                                <strong>Client Affect</strong>
                                <div>{session.raw.client_affect || ''}</div>
                              </div>
                              <div>
                                <strong>Homicidal Ideation</strong>
                                <div>{session.raw.homicidal_ideation || ''}</div>
                              </div>
                              <div>
                                <strong>Attendees</strong>
                                <div>
                                  {(session.raw.case_mh_session_attendee || [])
                                    .map(a =>
                                      a.person
                                        ? `${a.person.first_name || ''} ${a.person.last_name || ''}`.trim()
                                        : ''
                                    )
                                    .filter(Boolean)
                                    .join(', ')}
                                </div>
                              </div>

                              {/* Fourth row: Notes occupies one column alone, rest left empty to maintain alignment */}
                              <div style={{ gridColumn: '1 / span 4' }}>
                                <strong>Notes</strong>
                                <div>{session.raw.comments || ''}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )})
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="session-log-pagination" data-aoi="Session Log Pagination">
              <button
                type="button"
                className="pagination-button"
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                data-aoi="First Page Button"
              >
                ««
              </button>
              <button
                type="button"
                className="pagination-button"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                data-aoi="Previous Page Button"
              >
                «
              </button>
              <span className="pagination-page-number" data-aoi="Page Number">
                {currentPage}
              </span>
              <button
                type="button"
                className="pagination-button"
                onClick={() => setCurrentPage(currentPage + 1)}
                data-aoi="Next Page Button"
              >
                »
              </button>
              <button
                type="button"
                className="pagination-button"
                onClick={() => setCurrentPage(999)}
                data-aoi="Last Page Button"
              >
                »»
              </button>
              <select
                className="pagination-items-per-page"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                data-aoi="Items Per Page Select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="pagination-items-text" data-aoi="Items Per Page Text">
                items per page
              </span>
            </div>
          </div>
        )}

        {/* CALENDAR VIEW */}
        {activeTab === "calendar" && (
          <div className="session-log-content calendar-view" data-aoi="Calendar View">
            {/* Calendar Controls */}
            <div className="calendar-controls" data-aoi="Calendar Controls">
              <div className="calendar-controls-left" data-aoi="Calendar Controls Left">
                <button
                  type="button"
                  className="calendar-button"
                  onClick={goToToday}
                  data-aoi="Today Button"
                >
                  Today
                </button>
                <button
                  type="button"
                  className="calendar-nav-button"
                  onClick={calendarView === "month" ? goToPreviousMonth : goToPreviousWeek}
                  data-aoi="Previous Button"
                >
                  «
                </button>
                <button
                  type="button"
                  className="calendar-nav-button"
                  onClick={calendarView === "month" ? goToNextMonth : goToNextWeek}
                  data-aoi="Next Button"
                >
                  »
                </button>
                <span className="calendar-date-display" data-aoi="Calendar Date Display">
                  📅 {calendarView === "month" ? formatMonthYear(currentDate) : formatWeekRange(currentDate)}
                </span>
              </div>
              <div className="calendar-controls-right" data-aoi="Calendar Controls Right">
                <button
                  type="button"
                  className={`calendar-view-button ${calendarView === "month" ? "active" : ""}`}
                  onClick={() => setCalendarView("month")}
                  data-aoi="Month View Button"
                >
                  Month
                </button>
                <button
                  type="button"
                  className={`calendar-view-button ${calendarView === "week" ? "active" : ""}`}
                  onClick={() => setCalendarView("week")}
                  data-aoi="Week View Button"
                >
                  Week
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            {calendarView === "month" ? (
              <div className="calendar-grid month-view" data-aoi="Month Calendar Grid">
                <div className="calendar-weekdays" data-aoi="Calendar Weekdays">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <div key={day} className="calendar-weekday" data-aoi={`Weekday ${day}`}>
                      {day}
                    </div>
                  ))}
                </div>
                <div className="calendar-days-grid" data-aoi="Calendar Days Grid">
                  {getCalendarDays().map((day, index) => (
                    <div
                      key={index}
                      className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday(day.fullDate) ? 'today' : ''}`}
                      data-aoi={`Calendar Day ${day.date}`}
                    >
                      <span className="calendar-day-number" data-aoi={`Day Number ${day.date}`}>
                        {day.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="calendar-grid week-view" data-aoi="Week Calendar Grid">
                <div className="calendar-week-header" data-aoi="Week Header">
                  <div className="calendar-time-column" data-aoi="Time Column"></div>
                  {getCalendarDays().map((day, index) => (
                    <div key={index} className="calendar-day-header" data-aoi={`Day Header ${day.date}`}>
                      <div className="day-name" data-aoi={`Day Name ${day.dayName}`}>
                        {day.dayName}
                      </div>
                      <div className="day-date" data-aoi={`Day Date ${day.date}`}>
                        {day.date}/{day.fullDate.getMonth() + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="calendar-week-body" data-aoi="Week Body">
                  <div className="calendar-time-slots" data-aoi="Time Slots">
                    {getTimeSlots().map((time, index) => (
                      <div key={index} className="calendar-time-slot" data-aoi={`Time Slot ${time}`}>
                        {time}
                      </div>
                    ))}
                  </div>
                  <div className="calendar-week-days" data-aoi="Week Days">
                    {getCalendarDays().map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`calendar-week-day ${isToday(day.fullDate) ? 'today' : ''}`}
                        data-aoi={`Week Day ${day.date}`}
                      >
                        {getTimeSlots().map((time, timeIndex) => (
                          <div key={timeIndex} className="calendar-time-cell" data-aoi={`Time Cell ${day.date} ${time}`}>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="show-full-day-button"
                  data-aoi="Show Full Day Button"
                >
                  🕐 Show full day
                </button>
              </div>
            )}
          </div>
        )}
        </section>

        {/* DOCUMENT UPLOAD SECTION */}
        <DocumentUploadSection
          documents={documents}
          onFileSelect={() => {
            // Handle file select
            console.log("File select clicked");
          }}
          showRemovedCheckbox={true}
          showInstructions={true}
          sectionTitle="Document Upload"
        />

      {/* Session Log Modal */}
      <SessionLogModal
        open={sessionLogModalOpen}
        onClose={() => {
          setSessionLogModalOpen(false);
          setEditingSession(null);
        }}
        onSave={async (session) => {
          console.log("Session log saved:", session);
          await loadSessions();
          setSessionLogModalOpen(false);
          setEditingSession(null);
        }}
        caseId={caseId}
        cacId={cacId}
        editData={editingSession}
      />
      </div>
    </div>
  );
};

export default SessionLogAppointments;

