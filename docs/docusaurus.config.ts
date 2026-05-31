import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
    title: "DepositGuard",
    tagline: "On-chain rental deposit escrow powered by Solana and Gemini AI",
    favicon: "img/favicon.ico",

    url: "https://kevinle3212.github.io",
    baseUrl: "/DepositGuard/",
    trailingSlash: false,

    organizationName: "kevinle3212",
    projectName: "DepositGuard",
    deploymentBranch: "gh-pages",

    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",

    i18n: {
        defaultLocale: "en",
        locales: ["en"],
    },

    presets: [
        [
            "classic",
            {
                docs: {
                    sidebarPath: "./sidebars.ts",
                    routeBasePath: "/",
                    editUrl: "https://github.com/kevinle3212/DepositGuard/tree/main/docs/",
                },
                blog: false,
                theme: {
                    customCss: "./src/css/custom.css",
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        navbar: {
            title: "DepositGuard",
            items: [
                { type: "docSidebar", sidebarId: "mainSidebar", position: "left", label: "Docs" },
                {
                    href: "https://github.com/kevinle3212/DepositGuard",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        { label: "Setup Guide", to: "/setup" },
                        { label: "API Reference", to: "/api" },
                        { label: "Smart Contracts", to: "/smart-contracts" },
                    ],
                },
                {
                    title: "More",
                    items: [
                        { label: "GitHub", href: "https://github.com/kevinle3212/DepositGuard" },
                        { label: "Changelog", to: "/changelog" },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} DepositGuard. Built with Docusaurus.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: ["rust", "bash", "toml"],
        },
    } satisfies Preset.ThemeConfig,
};

export default config;
