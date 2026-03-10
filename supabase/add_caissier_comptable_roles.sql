-- Migration: ajouter les rôles caissier et comptable à la contrainte users_role_check
-- Date: 2026-02-23
-- Corrige l'erreur: new row for relation "users" violates check constraint "users_role_check"

begin;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'directrice', 'chef', 'employe', 'lecture', 'comptable', 'caissier'));

commit;
