# Déployer la fonction create-user

Votre machine a des fichiers verrouillés (erreur EBUSY). Suivez ces étapes :

## Étape 1 : Libérer les fichiers

1. **Fermez Cursor** complètement
2. **Fermez tous les terminaux**
3. Ouvrez l’**Explorateur de fichiers** Windows
4. Allez dans `D:\Developpements\React-project\suivi_tache_crg\node_modules`
5. Supprimez le dossier `supabase` (s’il existe)
6. Si la suppression échoue, redémarrez votre PC

## Étape 2 : Installer Supabase CLI

Ouvrez **PowerShell en tant qu’administrateur** et exécutez :

```powershell
# Via Scoop (recommandé sur Windows)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## Étape 3 : Déployer

```powershell
cd d:\Developpements\React-project\suivi_tache_crg
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase secrets set RESEND_API_KEY=re_votre_cle
supabase functions deploy create-user
```

Remplacez `VOTRE_PROJECT_REF` par l’ID de votre projet (dans l’URL du dashboard Supabase).

## Alternative : Déploiement via le Dashboard Supabase

Si la CLI pose problème, vous pouvez déployer manuellement :

1. Allez sur [supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Menu **Edge Functions** (ou **Functions**)
4. Créez ou modifiez la fonction `create-user`
5. Copiez le contenu de `supabase/functions/create-user/index.ts`
6. Déployez

La fonction est déjà utilisée par votre application. Si elle fonctionne actuellement, elle est déjà déployée et les modifications seront prises en compte au prochain déploiement.
