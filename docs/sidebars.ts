import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
    mainSidebar: [
        {
            type: "doc",
            id: "setup",
            label: "Setup Guide",
        },
        {
            type: "category",
            label: "API Reference",
            link: { type: "doc", id: "api/index" },
            items: [
                "api/verify-wallet",
                "api/upload-contract",
                "api/send-signing-link",
                "api/assess-damage",
                "api/tts",
                "api/notify",
                "api/webhook-deadline",
            ],
        },
        {
            type: "doc",
            id: "architecture",
            label: "Architecture",
        },
        {
            type: "category",
            label: "Smart Contracts",
            link: { type: "doc", id: "smart-contracts/index" },
            items: [
                "smart-contracts/pdas",
                "smart-contracts/instructions",
                "smart-contracts/state-machine",
            ],
        },
        {
            type: "category",
            label: "Tutorials",
            items: [
                "tutorials/landlord-creates-lease",
                "tutorials/tenant-funds-escrow",
                "tutorials/dispute-flow",
                "tutorials/arbitration-panel",
            ],
        },
        {
            type: "doc",
            id: "faq",
            label: "FAQ & Troubleshooting",
        },
        {
            type: "doc",
            id: "glossary",
            label: "Glossary",
        },
        {
            type: "doc",
            id: "roadmap",
            label: "Roadmap",
        },
        {
            type: "doc",
            id: "changelog",
            label: "Changelog",
        },
    ],
};

export default sidebars;
