# VPS Architecture & Deployment Guide

This document describes the production setup, architecture, and operational procedures for the self-hosted **Guidelines WebApp** on `41.33.93.208` (SSH port `2222`).

---

## 1. System Architecture

```
Internet (Port 80)
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│  VPS: 41.33.93.208    SSH: port 2222                      │
│                               
