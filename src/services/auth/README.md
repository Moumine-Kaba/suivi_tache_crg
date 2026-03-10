# PinService

Gestion du code PIN (4 à 6 chiffres) avec hash et limitation des tentatives.

Le PIN de signature des factures utilise directement les RPC Supabase (`set_signature_pin`, `verify_signature_pin`).
