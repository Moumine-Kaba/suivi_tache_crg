-- Migration: s'assurer que toutes les colonnes de signature existent
-- À exécuter si les signatures employé/directrice ne s'affichent pas chez le comptable
-- Date: 2026-02-23

begin;

-- Signature du demandeur (employé)
alter table public.invoices
  add column if not exists applicant_signature text;

alter table public.invoices
  add column if not exists applicant_signature_image text;

-- Cachet/Signature de la directrice
alter table public.invoices
  add column if not exists director_stamp_image text;

comment on column public.invoices.applicant_signature is 'Nom/signature du demandeur (employé)';
comment on column public.invoices.applicant_signature_image is 'Image base64 de la signature du demandeur';
comment on column public.invoices.director_stamp_image is 'Image base64 du cachet de la directrice';

commit;
