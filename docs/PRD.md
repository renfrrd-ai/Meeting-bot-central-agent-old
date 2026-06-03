# PRD - Autonomous Meeting Bot System (Vexa.ai)

## 1. Overview

This system is an autonomous meeting bot platform that automatically joins Google Meet calls using Vexa.ai.

It supports two execution modes:

- **Easy Mode:** Direct Google Meet URL triggers bot join
- **Advanced Mode:** Email invite triggers bot automatically via inbox monitoring

The system behaves as an event-driven agent pipeline where email invitations act as triggers for bot execution.

---

## 2. Problem Statement

Joining meetings with bots is currently manual, fragile, and not event-driven.

We need a system that:

- Reacts automatically to meeting invitations
- Eliminates manual bot triggering
- Maintains persistent authentication
- Reliably joins Google Meet sessions using automation

---

## 3. Goals

- Automatically join Google Meet calls via bot
- Support both direct URL and email-based triggers
- Use Vexa.ai as the orchestration layer
- Maintain persistent bot identity (email-based agent)
- Ensure reliable meeting entry without human intervention

---

## 4. Non-Goals

- Multi-platform support (Zoom, Teams) initially
- Advanced meeting intelligence (summaries, insights) in v1
- UI dashboard (API-first system only)
- Real-time collaboration features

---

## 5. System Concept

The system is built around a trigger-based agent model:

Email or URL → Vexa Listener → Bot Orchestrator → Meeting Bot → Google Meet

---

## 6. Core Architecture

### 6.1 Components

#### 1. Trigger Layer

Two sources:

- Google Meet URL (manual trigger)
- Email invitation to bot identity (automatic trigger)

---

#### 2. Email Listener (Advanced Core)

- Watches bot inbox (e.g. renfredbot@gmail.com)
- Detects Google Meet invitations
- Extracts meeting URL
- Sends event to Vexa orchestrator

---

#### 3. Vexa Orchestrator

- Central control system
- Receives triggers from:
  - API (URL mode)
  - Email listener (invite mode)
- Launches bot session

---

#### 4. Meeting Bot Engine

Executes actual joining logic using Vexa runtime or Playwright fallback.

Responsibilities:

- Open meeting
- Authenticate session
- Join call
- Handle prompts (mic/camera)

---

#### 5. Auth System

- Persistent Google login session
- Prevent repeated login prompts
- Store cookies and session state securely

---

## 7. Execution Flows

### 7.1 Easy Mode (Direct URL)

1. User sends Google Meet URL
2. API receives request
3. Vexa orchestrator launches bot
4. Bot joins meeting

---

### 7.2 Advanced Mode (Email Trigger)

1. User creates Google Meet
2. User invites bot email (e.g. renfredbot@gmail.com)
3. Google sends email invitation
4. Email listener detects invite
5. System extracts meeting URL
6. Vexa orchestrator triggers bot
7. Bot joins automatically

---

## 8. Functional Requirements

- Accept Google Meet URL via API
- Monitor bot email inbox for invites
- Extract valid meeting links from emails
- Launch bot via Vexa or fallback automation
- Maintain persistent authentication state
- Log all lifecycle events:
  - trigger received
  - bot started
  - join success or failure

---

## 9. Constraints

- Must be implemented in Node.js + TypeScript
- Must handle unstable Google Meet UI
- Must assume email delays and retries
- Must prioritize reliability over speed or complexity
- Must work with headless or semi-headless browser sessions

---

## 10. Success Criteria

- Bot joins meeting successfully from URL trigger
- Bot joins meeting successfully from email trigger
- No manual login required after setup
- System reliably detects and reacts to invites
- Failures are recoverable or clearly logged

---

## 11. Key Design Principles

- Event-driven architecture (email = trigger source)
- Simplicity in MVP execution path
- Modular separation of listener, orchestrator, and bot engine
- Reliability over feature expansion
- Persistent identity is mandatory (bot email is a core asset)

---

## 12. Future Enhancements

- Transcript extraction from meetings
- Real-time AI meeting assistant layer
- Multi-bot scaling
- Support for Zoom and Teams
- Admin dashboard for bot control
- Smart scheduling and calendar integration

---

## 13. Summary

This system is fundamentally:

A trigger-based autonomous agent network where email invitations or URLs activate bots that join Google Meet sessions via Vexa orchestration.
