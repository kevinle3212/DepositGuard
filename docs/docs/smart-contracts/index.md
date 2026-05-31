---
id: index
title: Smart Contract Reference
---

# Smart Contract Reference

Program: **nest-crow**  
Program ID (Devnet): `F1UroT66B49zt8kMCr8oRo89AsBo4BWebEJjDRH5wZ9a`  
Framework: Anchor 0.31  
Token: USDC (SPL token, 6 decimals)

## Program structure

```
programs/nest-crow/src/
  lib.rs          — instruction dispatch
  state/          — account structs (EscrowState, LeaseConfig, ClaimRecord,
                    ArbitrationEscrow, ArbitrationPanel)
  instructions/   — one file per instruction handler
  errors.rs       — custom error codes
```

## Accounts

See [PDAs](./pdas) for seeds and layout of every account struct.

## Instructions

See [Instructions](./instructions) for the full list with account constraints and business logic.

## State machine

See [State Machine](./state-machine) for valid status transitions and enforcement rules.
