import React from 'react';
import { X, Cloud, ShieldCheck, Database, CheckCircle2, Copy, ExternalLink, Zap, KeyRound } from 'lucide-react';

interface AWSGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export function AWSGuideModal({ isOpen, onClose, theme }: AWSGuideModalProps) {
  if (!isOpen) return null;

  const panelBg =
    theme === 'dark'
      ? 'bg-[#090d16] text-zinc-100 border border-zinc-800'
      : 'bg-white text-slate-800 border border-slate-200 shadow-2xl';

  const cardBg =
    theme === 'dark'
      ? 'bg-black/40 border-zinc-800/80'
      : 'bg-slate-50 border-slate-200';

  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar ${panelBg} rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Cloud className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-wide flex items-center gap-2">
                <span>AWS Free Tier ($100 Credits) Architecture</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
                  $0 / Month
                </span>
              </h3>
              <p className="text-xs text-zinc-400 font-light">
                Beginner Guide: Amazon Cognito Auth & DynamoDB Points Storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Free Tier Allowance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className={`p-3 rounded-2xl border ${cardBg} space-y-1`}>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <ShieldCheck className="h-4 w-4" />
              <span>AWS Cognito</span>
            </div>
            <div className="text-base font-light font-metallic text-emerald-400">
              50,000 MAUs
            </div>
            <div className="text-[10px] text-zinc-400 font-light">
              Free forever for user signups, email verification & JWT logins.
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${cardBg} space-y-1`}>
            <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
              <Database className="h-4 w-4" />
              <span>Amazon DynamoDB</span>
            </div>
            <div className="text-base font-light font-metallic text-emerald-400">
              25 GB Storage
            </div>
            <div className="text-[10px] text-zinc-400 font-light">
              Free forever + 25 Read / 25 Write Units for points & journeys.
            </div>
          </div>

          <div className={`p-3 rounded-2xl border ${cardBg} space-y-1`}>
            <div className="flex items-center gap-1.5 text-xs text-teal-400 font-medium">
              <Zap className="h-4 w-4" />
              <span>AWS Starter Credit</span>
            </div>
            <div className="text-base font-light font-metallic text-amber-400">
              $100.00 Balance
            </div>
            <div className="text-[10px] text-zinc-400 font-light">
              Never consumed because both services fit 100% inside Free Tier!
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3 pt-2 text-xs">
          {/* Step 1 */}
          <div className={`p-3.5 rounded-2xl border ${cardBg} space-y-1.5`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">1</span>
                Create Your Free AWS Account
              </span>
              <a
                href="https://aws.amazon.com/free/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
              >
                <span>aws.amazon.com/free</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-zinc-400 font-light leading-relaxed">
              Sign up for an AWS account. Choose the <strong>Basic Support (Free)</strong> plan. AWS gives you 12 months of Free Tier benefits plus always-free services (Cognito 50k MAUs and DynamoDB 25GB).
            </p>
          </div>

          {/* Step 2 */}
          <div className={`p-3.5 rounded-2xl border ${cardBg} space-y-1.5`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">2</span>
                Create Amazon Cognito User Pool (Auth)
              </span>
              <span className="text-[10px] text-emerald-400 font-metallic">Free Tier: 50,000 Users</span>
            </div>
            <ul className="text-zinc-400 font-light space-y-1 list-disc pl-4 leading-relaxed">
              <li>In the AWS Console search bar, type <strong>Cognito</strong> and click <strong>Create user pool</strong>.</li>
              <li>Authentication provider: select <strong>Email</strong>.</li>
              <li>Password policy: Minimum 6 characters. Set MFA to <strong>No MFA</strong> (simplest & free).</li>
              <li>User pool name: enter <code className="text-emerald-400">greenpath-user-pool</code>.</li>
              <li>App client: Name it <code className="text-emerald-400">greenpath-client</code>. Uncheck "Generate client secret" (SPA browsers do not use secrets).</li>
              <li>Click <strong>Create user pool</strong>. Copy the generated <strong>User Pool ID</strong> and <strong>App Client ID</strong>.</li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className={`p-3.5 rounded-2xl border ${cardBg} space-y-1.5`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">3</span>
                Create Amazon DynamoDB Table (Points & Journeys)
              </span>
              <span className="text-[10px] text-cyan-400 font-metallic">Free Tier: 25 GB</span>
            </div>
            <ul className="text-zinc-400 font-light space-y-1 list-disc pl-4 leading-relaxed">
              <li>Search for <strong>DynamoDB</strong> in the console and click <strong>Create table</strong>.</li>
              <li>Table name: enter <code className="text-emerald-400">GreenPathUsers</code>.</li>
              <li>Partition key: enter <code className="text-emerald-400">userId</code> (Type: String).</li>
              <li>Table settings: Select <strong>Default settings</strong> (Provisioned: 5 Read / 5 Write capacity units, which is 100% free under the 25 unit free quota).</li>
              <li>Click <strong>Create table</strong>.</li>
            </ul>
          </div>

          {/* Step 4 */}
          <div className={`p-3.5 rounded-2xl border ${cardBg} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">4</span>
                Save Environment Variables
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `VITE_AWS_REGION=us-east-1\nVITE_AWS_USER_POOL_ID=us-east-1_xxxxxxxxx\nVITE_AWS_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx\nVITE_AWS_DYNAMODB_TABLE=GreenPathUsers`,
                    'env'
                  )
                }
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors"
              >
                {copiedKey === 'env' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === 'env' ? 'Copied' : 'Copy Template'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-black/60 border border-black/10 dark:border-white/10 text-[11px] font-mono text-zinc-300 overflow-x-auto">
{`VITE_AWS_REGION=us-east-1
VITE_AWS_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_AWS_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_DYNAMODB_TABLE=GreenPathUsers`}
            </pre>
            <p className="text-zinc-400 font-light text-[11px]">
              Note: Right now, Green Path includes an automated offline-first persistence engine that functions with 100% features enabled even without AWS credentials! When you plug in your AWS values, it syncs directly with Cognito and DynamoDB.
            </p>
          </div>

          {/* Step 5: Deploy to AWS */}
          <div className={`p-3.5 rounded-2xl border ${cardBg} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px] font-bold">5</span>
                Deploy Your Web App on AWS (Free Tier: 1,000 GB CDN)
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `# 1. Build production static bundle\nnpm run build\n\n# 2. Deploy via AWS Amplify (Recommended - 1 Click):\n# Go to console.aws.amazon.com/amplify -> Click 'Host web app' -> Connect Git or upload 'dist' folder!\n\n# 3. Alternative: Deploy to Amazon S3 + CloudFront:\naws s3 mb s3://greenpath-eco-commute\naws s3 sync dist/ s3://greenpath-eco-commute\naws s3 website s3://greenpath-eco-commute --index-document index.html`,
                    'deploy'
                  )
                }
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors"
              >
                {copiedKey === 'deploy' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === 'deploy' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <div className="space-y-3 pt-1">
              <div className="bg-emerald-950/20 rounded-xl p-3 border border-emerald-500/20 text-xs text-zinc-300 space-y-2">
                <p className="font-semibold text-emerald-400">⚡ AWS Amplify Settings Walkthrough (Post-GitHub Link):</p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-zinc-400">
                  <li><strong className="text-zinc-200">App Name & Branch:</strong> Choose your app name and select your branch (usually <code className="text-emerald-400">main</code> or <code className="text-emerald-400">master</code>).</li>
                  <li><strong className="text-zinc-200">Build Settings:</strong> An <code className="text-emerald-400">amplify.yml</code> is included at the repo root. Ensure <span className="text-emerald-300 font-mono">baseDirectory: dist</span> (not <code className="text-rose-400">build</code>), with build command <code className="text-emerald-400">npm run build</code>.</li>
                  <li><strong className="text-zinc-200">Environment Variables:</strong> Under <em>Advanced Settings &gt; Environment variables</em>, add <code className="text-emerald-400">VITE_GOOGLE_MAPS_API_KEY</code> if using a custom key.</li>
                  <li><strong className="text-zinc-200">SPA URL Rewrites:</strong> In Amplify console under <em>Hosting &gt; Rewrites and redirects</em>, ensure single-page rewrite points to <code className="text-emerald-400">/index.html</code> (status 200) to avoid 404 on refresh.</li>
                  <li><strong className="text-zinc-200">Save & Deploy:</strong> Click <em>Save and deploy</em>. AWS will automatically run the build and publish your live HTTPS URL!</li>
                </ol>
              </div>

              <p className="text-zinc-400 font-light text-xs leading-relaxed">
                <strong>Alternative (Amazon S3 + CloudFront):</strong><br />
                Create an S3 bucket with Static Website Hosting enabled, sync the compiled <code className="text-emerald-400">dist/</code> folder, and hook up a CloudFront distribution for worldwide CDN delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-semibold text-xs tracking-wide shadow-md transition-all active:scale-[0.98]"
          >
            Got It! Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
