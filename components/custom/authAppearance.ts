import { dark } from "@clerk/themes";

export const clerkAuthAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#10b981", // emerald-500
    colorBackground: "#0b0f19", // deep slate card
    colorInputBackground: "#0f172a", // slate-900 input
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#cbd5e1", // slate-300
    colorTextOnPrimaryBackground: "#020617",
    colorNeutral: "#94a3b8",
    colorDanger: "#f43f5e",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "w-full shadow-none",
    card: "!bg-[#0b0f19] !border !border-slate-800 shadow-2xl backdrop-blur-xl rounded-2xl p-6 sm:p-8",
    headerTitle: "!text-white !font-bold !text-xl tracking-tight",
    headerSubtitle: "!text-slate-300 !text-sm",
    socialButtonsBlockButton: "!border !border-slate-700/80 !bg-slate-900 hover:!bg-slate-800 hover:!border-slate-600 !text-slate-100 transition-all duration-200 shadow-sm",
    socialButtonsBlockButtonText: "!text-slate-100 !font-medium !text-sm",
    socialButtonsBlockButtonProviderIcon: "w-4 h-4",
    dividerLine: "!bg-slate-700/80",
    dividerText: "!text-slate-300 !text-xs !font-semibold uppercase tracking-wider",
    formFieldLabel: "!text-slate-200 !text-xs !font-semibold uppercase tracking-wider",
    formFieldInput: "!bg-slate-900 !border !border-slate-700 !text-white placeholder:!text-slate-400 focus:!border-emerald-500 focus:!ring-1 focus:!ring-emerald-500 rounded-lg transition-all text-sm py-2 px-3",
    formButtonPrimary: "!bg-emerald-500 hover:!bg-emerald-400 !text-slate-950 !font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] py-2.5",
    footerActionLink: "!text-emerald-400 hover:!text-emerald-300 transition-colors !font-semibold",
    footerActionText: "!text-slate-300 !text-xs",
    identityPreviewText: "!text-slate-100 !font-medium",
    identityPreviewEditButton: "!text-emerald-400 hover:!text-emerald-300",
    formFieldAction: "!text-emerald-400 hover:!text-emerald-300 !text-xs",
    formFieldSuccessText: "!text-emerald-400 !text-xs",
    formFieldErrorText: "!text-rose-400 !text-xs",
    alert: "!bg-rose-950/60 !border !border-rose-800 !text-rose-200 text-xs rounded-lg p-3",
    alertText: "!text-rose-200 text-xs",
    footer: "!border-t !border-slate-800/80 !bg-transparent pt-4 mt-4 !text-slate-400",
    logoBox: "hidden",
  },
};
