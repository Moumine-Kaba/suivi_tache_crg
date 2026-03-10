-- Patch: ajouter la colonne applicant_signature à la table invoices
-- Le demandeur doit signer sa facture avant l'envoi à la directrice
-- Date: 2026-02-23

begin;

alter table public.invoices
add column if not exists applicant_signature text;

alter table public.invoices
add column if not exists applicant_signature_image text;

commit;
