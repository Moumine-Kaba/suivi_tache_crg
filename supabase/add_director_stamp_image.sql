-- Migration: ajout de l'image du cachet de la directrice
-- Date: 2026-02-23
-- Permet de stocker et afficher l'image du cachet chez le comptable

begin;

alter table public.invoices
  add column if not exists director_stamp_image text;

comment on column public.invoices.director_stamp_image is 'Image base64 du cachet de la directrice';

commit;
