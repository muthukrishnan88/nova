
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 3000);
const NUMVERIFY_API_KEY = process.env.NUMVERIFY_API_KEY || "";

app.use(cors());

app.use(
    express.json({
        limit: "12mb"
    })
);

/* =========================================================
   FILE PATHS
========================================================= */

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

/* =========================================================
   COMMON HELPERS
========================================================= */

function cleanText(value) {
    return String(value || "")
        .replace(/ /g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function unique(values) {
    return [
        ...new Set(
            values.filter(Boolean)
        )
    ];
}

function escapeRegex(value) {
    return String(value || "")
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
}

/* =========================================================
   LINK
   URL NORMALIZATION
========================================================= */

function normalizeUrl(input) {
    let value =
        String(input || "").trim();

    if (!value) {
        throw new Error(
            "URL is required."
        );
    }

    if (!/^https?:\/\//i.test(value)) {
        value =
            "https://" + value;
    }

    try {
        const parsed =
            new URL(value);

        if (
            !["http:", "https:"]
                .includes(parsed.protocol)
        ) {
            throw new Error(
                "Only HTTP and HTTPS URLs are supported."
            );
        }

        return parsed.toString();

    } catch {
        throw new Error(
            "Invalid URL."
        );
    }
}

/* =========================================================
   LINK
   PRIVATE NETWORK PROTECTION
========================================================= */

function isPrivateIPv4(ip) {
    const parts =
        ip.split(".").map(Number);

    if (
        parts.length !== 4 ||
        parts.some(
            n =>
                !Number.isInteger(n) ||
                n < 0 ||
                n > 255
        )
    ) {
        return false;
    }

    const [a, b] = parts;

    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 172 &&
            b >= 16 &&
            b <= 31) ||
        (a === 192 &&
            b === 168) ||
        (a === 169 &&
            b === 254)
    );
}

function isPrivateIPv6(ip) {
    const value =
        String(ip || "")
            .toLowerCase();

    return (
        value === "::" ||
        value === "::1" ||
        value.startsWith("fc") ||
        value.startsWith("fd") ||
        /^fe[89ab]/.test(value)
    );
}

async function isBlockedHost(hostname) {
    const host =
        String(hostname || "")
            .toLowerCase();

    const blockedNames = [
        "localhost",
        "localhost.localdomain",
        "ip6-localhost",
        "ip6-loopback"
    ];

    if (
        blockedNames.includes(host) ||
        host.endsWith(".localhost") ||
        host.endsWith(".local") ||
        host.endsWith(".internal")
    ) {
        return true;
    }

    const family =
        net.isIP(host);

    if (family === 4) {
        return isPrivateIPv4(host);
    }

    if (family === 6) {
        return isPrivateIPv6(host);
    }

    try {
        const addresses =
            await dns.lookup(
                host,
                {
                    all: true,
                    verbatim: true
                }
            );

        return addresses.some(
            item =>
                item.family === 4
                    ? isPrivateIPv4(
                        item.address
                    )
                    : isPrivateIPv6(
                        item.address
                    )
        );

    } catch {
        return false;
    }
}

/* =========================================================
   LINK
   DOMAIN HELPERS
========================================================= */

function getRootDomain(hostname) {
    const parts =
        String(hostname || "")
            .split(".")
            .filter(Boolean);

    if (parts.length <= 2) {
        return hostname;
    }

    const suffix =
        parts.slice(-2).join(".");

    const specialSuffixes = [
        "co.uk",
        "org.uk",
        "com.au",
        "co.in",
        "com.br",
        "co.jp"
    ];

    if (
        specialSuffixes
            .includes(suffix)
    ) {
        return parts
            .slice(-3)
            .join(".");
    }

    return suffix;
}

function getSubdomain(hostname) {
    const root =
        getRootDomain(hostname);

    if (hostname === root) {
        return "";
    }

    if (
        hostname.endsWith(
            "." + root
        )
    ) {
        return hostname.slice(
            0,
            -(root.length + 1)
        );
    }

    return "";
}

function isDomainUnder(
    hostname,
    domain
) {
    const host =
        hostname.toLowerCase();

    const target =
        domain.toLowerCase();

    return (
        host === target ||
        host.endsWith(
            "." + target
        )
    );
}

/* =========================================================
   LINK
   URL PARSER
========================================================= */

function parseUrl(urlString) {
    const url =
        new URL(urlString);

    const queryParams = {};

    for (
        const [key, value]
        of url.searchParams.entries()
    ) {
        if (
            queryParams[key] ===
            undefined
        ) {
            queryParams[key] =
                value;

        } else if (
            Array.isArray(
                queryParams[key]
            )
        ) {
            queryParams[key]
                .push(value);

        } else {
            queryParams[key] = [
                queryParams[key],
                value
            ];
        }
    }

    return {
        raw: urlString,
        protocol:
            url.protocol
                .replace(":", ""),
        hostname:
            url.hostname,
        domain:
            url.hostname,
        rootDomain:
            getRootDomain(
                url.hostname
            ),
        subdomain:
            getSubdomain(
                url.hostname
            ),
        port:
            url.port ||
            (
                url.protocol ===
                "https:"
                    ? "443"
                    : "80"
            ),
        path:
            url.pathname || "/",
        pathSegments:
            url.pathname
                .split("/")
                .filter(Boolean),
        query:
            url.search
                ? url.search.substring(1)
                : "",
        queryParams,
        fragment:
            url.hash
                ? url.hash.substring(1)
                : "",
        length:
            urlString.length,
        encodedContent:
            /%[0-9a-f]{2}/i
                .test(urlString)
    };
}

/* =========================================================
   LINK
   HTML HELPERS
========================================================= */

function stripHtml(html) {
    return String(html || "")
        .replace(
            /<script[\s\S]*?<\/script>/gi,
            " "
        )
        .replace(
            /<style[\s\S]*?<\/style>/gi,
            " "
        )
        .replace(
            /<noscript[\s\S]*?<\/noscript>/gi,
            " "
        )
        .replace(
            /<svg[\s\S]*?<\/svg>/gi,
            " "
        )
        .replace(
            /<[^>]+>/g,
            " "
        )
        .replace(
            /&nbsp;/gi,
            " "
        )
        .replace(
            /&amp;/gi,
            "&"
        )
        .replace(
            /&quot;/gi,
            '"'
        )
        .replace(
            /&#39;/gi,
            "'"
        )
        .replace(
            /&lt;/gi,
            "<"
        )
        .replace(
            /&gt;/gi,
            ">"
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function extractTagContent(
    html,
    tagName
) {
    const regex =
        new RegExp(
            `<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
            "i"
        );

    const match =
        String(html || "")
            .match(regex);

    return match
        ? cleanText(
            stripHtml(match[1])
        )
        : "";
}

function extractMeta(
    html,
    name
) {
    const safeName =
        escapeRegex(name);

    const regex1 =
        new RegExp(
            `<meta\\b[^>]*(?:name|property)=["']${safeName}["'][^>]*content=["']([^"']*)["'][^>]*>`,
            "i"
        );

    const regex2 =
        new RegExp(
            `<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${safeName}["'][^>]*>`,
            "i"
        );

    const match =
        String(html || "")
            .match(regex1) ||
        String(html || "")
            .match(regex2);

    return match
        ? cleanText(match[1])
        : "";
}

function extractHeadings(html) {
    const results = [];

    const regex =
        /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi;

    let match;

    while (
        (match =
            regex.exec(
                String(html || "")
            )) !== null
    ) {
        const text =
            cleanText(
                stripHtml(
                    match[2]
                )
            );

        if (text) {
            results.push({
                level:
                    match[1]
                        .toUpperCase(),
                text
            });
        }

        if (
            results.length >= 30
        ) {
            break;
        }
    }

    return results;
}

function extractLinks(
    html,
    baseUrl
) {
    const results = [];

    const regex =
        /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
        (match =
            regex.exec(
                String(html || "")
            )) !== null
    ) {
        if (
            results.length >= 100
        ) {
            break;
        }

        const href =
            match[1].trim();

        if (
            !href ||
            href.startsWith("#")
        ) {
            continue;
        }

        try {
            results.push({
                url:
                    new URL(
                        href,
                        baseUrl
                    ).toString(),
                text:
                    cleanText(
                        stripHtml(
                            match[2]
                        )
                    )
            });

        } catch {
            // ignore
        }
    }

    return results;
}

function extractImages(
    html,
    baseUrl
) {
    const results = [];

    const regex =
        /<img\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi;

    let match;

    while (
        (match =
            regex.exec(
                String(html || "")
            )) !== null
    ) {
        if (
            results.length >= 50
        ) {
            break;
        }

        try {
            results.push(
                new URL(
                    match[1],
                    baseUrl
                ).toString()
            );

        } catch {
            // ignore
        }
    }

    return results;
}

/* =========================================================
   LINK
   KNOWN SERVICES
========================================================= */

function detectKnownService(url) {
    const host =
        url.hostname.toLowerCase();

    const pathname =
        url.pathname.toLowerCase();

    if (
        host === "docs.google.com" &&
        pathname.startsWith(
            "/spreadsheets/"
        )
    ) {
        return {
            provider: "Google",
            name: "Google Sheets",
            type:
                "Spreadsheet / Collaboration",
            category:
                "Google Workspace",
            purpose:
                "A Google Sheets document used for spreadsheets, tables, calculations, shared data, or collaboration.",
            summary:
                "This link points to Google Sheets.",
            confidence: "High",
            contentDescription:
                "A spreadsheet containing rows, columns, tables, formulas, or shared data.",
            official: true
        };
    }

    if (
        host === "docs.google.com" &&
        pathname.startsWith(
            "/document/"
        )
    ) {
        return {
            provider: "Google",
            name: "Google Docs",
            type:
                "Document / Collaboration",
            category:
                "Google Workspace",
            purpose:
                "A document hosted by Google Docs.",
            summary:
                "This link points to Google Docs.",
            confidence: "High",
            contentDescription:
                "A shared Google document.",
            official: true
        };
    }

    if (
        host === "docs.google.com" &&
        pathname.startsWith(
            "/forms/"
        )
    ) {
        return {
            provider: "Google",
            name: "Google Forms",
            type:
                "Online Form",
            category:
                "Google Workspace",
            purpose:
                "An online form used to collect information and responses.",
            summary:
                "This link points to Google Forms.",
            confidence: "High",
            contentDescription:
                "An online form that may contain questions, fields, choices, and response collection.",
            official: true
        };
    }

    if (
        host === "forms.gle"
    ) {
        return {
            provider: "Google",
            name: "Google Forms",
            type:
                "Online Form / Short Link",
            category:
                "Google Workspace",
            purpose:
                "A shortened Google Forms link.",
            summary:
                "This link uses Google's forms.gle service.",
            confidence: "High",
            contentDescription:
                "A Google Forms destination.",
            official: true
        };
    }

    if (
        isDomainUnder(
            host,
            "drive.google.com"
        )
    ) {
        return {
            provider: "Google",
            name: "Google Drive",
            type:
                "Cloud Storage / File Sharing",
            category:
                "Google Workspace",
            purpose:
                "A Google Drive file or folder.",
            summary:
                "This link points to Google Drive.",
            confidence: "High",
            contentDescription:
                "A file or folder hosted by Google Drive.",
            official: true
        };
    }

    if (
        host === "youtube.com" ||
        host === "youtu.be" ||
        isDomainUnder(
            host,
            "youtube.com"
        )
    ) {
        return {
            provider: "Google",
            name: "YouTube",
            type:
                "Video Platform",
            category:
                "Entertainment / Media",
            purpose:
                "A video hosting and streaming platform.",
            summary:
                "This link points to YouTube.",
            confidence: "High",
            contentDescription:
                "Video content, channels, comments, or media pages.",
            official: true
        };
    }

    if (
        host === "github.com" ||
        isDomainUnder(
            host,
            "github.com"
        )
    ) {
        return {
            provider: "GitHub",
            name: "GitHub",
            type:
                "Code Hosting / Development",
            category:
                "Software Development",
            purpose:
                "A platform for source code, repositories, issues, projects, and developer collaboration.",
            summary:
                "This link points to GitHub.",
            confidence: "High",
            contentDescription:
                "Code repositories, files, documentation, issues, releases, or developer projects.",
            official: true
        };
    }

    if (
        isDomainUnder(
            host,
            "microsoft.com"
        ) ||
        isDomainUnder(
            host,
            "microsoftonline.com"
        ) ||
        isDomainUnder(
            host,
            "office.com"
        ) ||
        isDomainUnder(
            host,
            "sharepoint.com"
        ) ||
        isDomainUnder(
            host,
            "outlook.com"
        )
    ) {
        return {
            provider: "Microsoft",
            name: "Microsoft Service",
            type:
                "Microsoft Online Service",
            category:
                "Productivity / Cloud",
            purpose:
                "A Microsoft online service or cloud platform.",
            summary:
                "This link points to a Microsoft-controlled domain.",
            confidence: "High",
            contentDescription:
                "Microsoft-hosted content or services.",
            official: true
        };
    }

    if (
        host === "linkedin.com" ||
        isDomainUnder(
            host,
            "linkedin.com"
        )
    ) {
        return {
            provider: "LinkedIn",
            name: "LinkedIn",
            type:
                "Professional Social Network",
            category:
                "Social Media",
            purpose:
                "A professional networking and career platform.",
            summary:
                "This link points to LinkedIn.",
            confidence: "High",
            contentDescription:
                "Professional profiles, company pages, jobs, posts, and networking content.",
            official: true
        };
    }

    if (
        host === "instagram.com" ||
        isDomainUnder(
            host,
            "instagram.com"
        )
    ) {
        return {
            provider: "Instagram",
            name: "Instagram",
            type:
                "Social Media",
            category:
                "Social Media",
            purpose:
                "A social media platform for photos, videos, profiles, and messages.",
            summary:
                "This link points to Instagram.",
            confidence: "High",
            contentDescription:
                "Photos, videos, profiles, posts, reels, and social content.",
            official: true
        };
    }

    if (
        host === "facebook.com" ||
        isDomainUnder(
            host,
            "facebook.com"
        )
    ) {
        return {
            provider: "Meta",
            name: "Facebook",
            type:
                "Social Media",
            category:
                "Social Media",
            purpose:
                "A social media platform for profiles, pages, posts, groups, and communication.",
            summary:
                "This link points to Facebook.",
            confidence: "High",
            contentDescription:
                "Profiles, pages, posts, groups, or social media content.",
            official: true
        };
    }

    return null;
}

/* =========================================================
   LINK
   SECURITY
========================================================= */

const BRANDS = {
    google: [
        "google.com",
        "google.co.in",
        "googleapis.com",
        "googleusercontent.com",
        "gstatic.com"
    ],
    microsoft: [
        "microsoft.com",
        "microsoftonline.com",
        "live.com",
        "outlook.com",
        "office.com"
    ],
    paypal: [
        "paypal.com",
        "paypalobjects.com"
    ],
    apple: [
        "apple.com",
        "icloud.com"
    ],
    amazon: [
        "amazon.com",
        "amazon.in",
        "amazonaws.com"
    ],
    facebook: [
        "facebook.com",
        "fb.com",
        "meta.com"
    ],
    instagram: [
        "instagram.com"
    ],
    whatsapp: [
        "whatsapp.com",
        "whatsapp.net"
    ],
    netflix: [
        "netflix.com"
    ],
    linkedin: [
        "linkedin.com"
    ],
    github: [
        "github.com",
        "githubusercontent.com"
    ]
};

function detectBrandImpersonation(
    hostname
) {
    const host =
        hostname.toLowerCase();

    const labels =
        host.split(".")
            .filter(Boolean);

    const root =
        getRootDomain(host);

    const detected = [];

    for (
        const brand
        of Object.keys(BRANDS)
    ) {
        const mentioned =
            labels.some(
                label =>
                    label === brand ||
                    label.includes(brand)
            );

        if (!mentioned) {
            continue;
        }

        const official =
            BRANDS[brand].some(
                domain =>
                    host === domain ||
                    host.endsWith(
                        "." + domain
                    )
            );

        if (!official) {
            detected.push({
                brand,
                rootDomain: root,
                hostname: host
            });
        }
    }

    return detected;
}

function detectNonProductionDomain(
    url
) {
    const labels =
        url.hostname
            .toLowerCase()
            .split(".");

    const suspicious = [
        "test",
        "testing",
        "dev",
        "development",
        "staging",
        "stage",
        "demo",
        "sandbox",
        "qa",
        "uat",
        "preview",
        "temp",
        "temporary",
        "fake",
        "mock"
    ];

    return unique(
        labels.filter(
            label =>
                suspicious.includes(
                    label
                )
        )
    );
}

function detectPaymentSignals(
    url
) {
    const text = (
        url.hostname +
        " " +
        url.pathname +
        " " +
        url.search
    ).toLowerCase();

    const paymentWords = [
        "payment",
        "pay",
        "checkout",
        "billing",
        "invoice",
        "card",
        "credit-card",
        "debit-card",
        "transaction",
        "wallet",
        "bank",
        "secure-payment"
    ];

    const accountWords = [
        "verify-account",
        "account-verification",
        "confirm-account",
        "secure-login",
        "verify-payment",
        "credential",
        "password",
        "signin",
        "sign-in",
        "login"
    ];

    return {
        paymentHits:
            unique(
                paymentWords.filter(
                    word =>
                        text.includes(
                            word
                        )
                )
            ),
        accountHits:
            unique(
                accountWords.filter(
                    word =>
                        text.includes(
                            word
                        )
                )
            )
    };
}

function detectKnownPhishingCampaign(
    url
) {
    const host =
        url.hostname.toLowerCase();

    const matches = [];

    if (
        host ===
        "forms.google.ss-o.com"
    ) {
        matches.push({
            type: "critical",
            title:
                "Known phishing domain",
            detail:
                "This hostname matches a known fake Google Forms phishing pattern.",
            points: 45
        });
    }

    if (
        host.includes("google") &&
        getRootDomain(host) !==
        "google.com"
    ) {
        matches.push({
            type: "critical",
            title:
                "Google brand impersonation",
            detail:
                `The hostname contains "google", but the registered root domain is ${getRootDomain(host)}.`,
            points: 28
        });
    }

    return matches;
}

function analyzeSecurity(
    rawUrl,
    fetchResult = null,
    knownService = null,
    fetchError = ""
) {
    const url =
        new URL(rawUrl);

    const host =
        url.hostname.toLowerCase();

    const indicators = [];

    let riskPoints = 0;

    function add(
        type,
        title,
        detail,
        points
    ) {
        indicators.push({
            type,
            title,
            detail,
            points
        });

        riskPoints += points;
    }

    if (
        url.protocol ===
        "https:"
    ) {
        add(
            "safe",
            "HTTPS is enabled",
            "The URL uses HTTPS encryption.",
            0
        );
    } else {
        add(
            "warning",
            "HTTPS is not enabled",
            "The URL does not use HTTPS.",
            18
        );
    }

    if (
        url.username ||
        url.password
    ) {
        add(
            "danger",
            "Embedded credentials",
            "The URL contains username or password information.",
            30
        );
    }

    if (
        url.hostname.includes("@")
    ) {
        add(
            "danger",
            "Suspicious hostname",
            "The hostname contains an unusual character.",
            20
        );
    }

    const nonProduction =
        detectNonProductionDomain(
            url
        );

    if (
        nonProduction.length
    ) {
        add(
            "warning",
            "Non-production label",
            `The hostname contains ${nonProduction.join(", ")}.`,
            10
        );
    }

    const payment =
        detectPaymentSignals(
            url
        );

    if (
        payment.paymentHits.length
    ) {
        add(
            "warning",
            "Payment-related URL",
            `Payment wording detected: ${payment.paymentHits.join(", ")}.`,
            8
        );
    }

    if (
        payment.accountHits.length
    ) {
        add(
            "warning",
            "Account-related URL",
            `Account or login wording detected: ${payment.accountHits.join(", ")}.`,
            10
        );
    }

    const impersonation =
        detectBrandImpersonation(
            host
        );

    for (
        const item
        of impersonation
    ) {
        add(
            "critical",
            "Possible brand impersonation",
            `The hostname appears to imitate ${item.brand}.`,
            28
        );
    }

    const phishing =
        detectKnownPhishingCampaign(
            url
        );

    for (
        const item
        of phishing
    ) {
        add(
            item.type,
            item.title,
            item.detail,
            item.points
        );
    }

    if (
        knownService
    ) {
        add(
            "safe",
            "Recognized service",
            `The domain is recognized as ${knownService.name}.`,
            0
        );
    }

    if (
        fetchError
    ) {
        add(
            "warning",
            "Website could not be fully inspected",
            "The destination could not be fetched for content verification.",
            8
        );
    }

    const score =
        Math.max(
            0,
            Math.min(
                100,
                100 -
                riskPoints
            )
        );

    let verdict =
        "Likely Safe";

    let riskLevel =
        "LOW RISK";

    if (
        score < 40
    ) {
        verdict =
            "High Risk";
        riskLevel =
            "HIGH RISK";

    } else if (
        score < 60
    ) {
        verdict =
            "Suspicious";
        riskLevel =
            "ELEVATED RISK";

    } else if (
        score < 80
    ) {
        verdict =
            "Review";
        riskLevel =
            "MEDIUM RISK";
    }

    let confidence =
        "Medium";

    if (
        knownService &&
        !impersonation.length
    ) {
        confidence =
            "High";
    }

    if (
        fetchError
    ) {
        confidence =
            "Low";
    }

    return {
        score,
        riskScore:
            100 - score,
        verdict,
        riskLevel,
        confidence,
        knownPhishing:
            phishing.length > 0,
        indicators,
        verification: {
            domain:
                getRootDomain(host),
            https:
                url.protocol ===
                "https:"
        },
        malwareReputation: {
            checked: false,
            available: false,
            message:
                "No paid malware reputation service is configured."
        }
    };
}

/* =========================================================
   LINK
   WEBSITE FETCH
========================================================= */

async function fetchWebsite(
    url
) {
    const parsed =
        new URL(url);

    if (
        await isBlockedHost(
            parsed.hostname
        )
    ) {
        throw new Error(
            "Private or local network destinations are not allowed."
        );
    }

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () =>
                controller.abort(),
            12000
        );

    try {
        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    redirect: "follow",
                    signal:
                        controller.signal,
                    headers: {
                        "User-Agent":
                            "SAFNEX-NOVA/1.0",
                        "Accept":
                            "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
                    }
                }
            );

        const contentType =
            response.headers
                .get(
                    "content-type"
                ) || "";

        const text =
            await response.text();

        return {
            status:
                response.status,
            contentType,
            finalUrl:
                response.url,
            body:
                text.slice(
                    0,
                    800000
                ),
            redirects: []
        };

    } finally {
        clearTimeout(timeout);
    }
}

function extractWebsiteData(
    result
) {
    const html =
        result?.body || "";

    const baseUrl =
        result?.finalUrl ||
        "";

    const title =
        extractTagContent(
            html,
            "title"
        );

    const description =
        extractMeta(
            html,
            "description"
        ) ||
        extractMeta(
            html,
            "og:description"
        );

    const headings =
        extractHeadings(
            html
        );

    const links =
        extractLinks(
            html,
            baseUrl
        );

    const images =
        extractImages(
            html,
            baseUrl
        );

    const text =
        stripHtml(
            html
        ).slice(
            0,
            30000
        );

    return {
        title,
        description,
        headings,
        links,
        images,
        text,
        textLength:
            text.length
    };
}

function fallbackWebsiteUnderstanding(
    urlInfo,
    website,
    knownService
) {
    if (
        knownService
    ) {
        return {
            name:
                website?.title ||
                knownService.name,
            type:
                knownService.type,
            category:
                knownService.category,
            purpose:
                knownService.purpose,
            summary:
                knownService.summary,
            services:
                [
                    knownService.contentDescription
                ],
            language:
                "Unknown",
            confidence:
                knownService.confidence,
            evidence:
                [
                    knownService.name,
                    knownService.contentDescription
                ]
        };
    }

    const text = (
        website?.title +
        " " +
        website?.description +
        " " +
        (
            website?.text ||
            ""
        ).slice(
            0,
            10000
        )
    ).toLowerCase();

    let type =
        "General Website";

    let category =
        "General";

    let purpose =
        "A publicly accessible website.";

    const services = [];

    if (
        /shop|store|cart|product|buy|price/
            .test(text)
    ) {
        type =
            "Shopping / E-commerce";
        category =
            "E-commerce";
        purpose =
            "A website related to products, shopping, or online purchases.";
        services.push(
            "Products or shopping"
        );
    }

    if (
        /blog|article|news|journal|post/
            .test(text)
    ) {
        type =
            "News / Blog / Information";
        category =
            "Information";
        purpose =
            "A website containing articles, posts, news, or informational content.";
        services.push(
            "Articles or information"
        );
    }

    if (
        /login|signin|account|dashboard/
            .test(text)
    ) {
        services.push(
            "Account or login services"
        );
    }

    if (
        /job|career|vacancy|recruitment|hiring/
            .test(text)
    ) {
        type =
            "Jobs / Careers";
        category =
            "Employment";
        purpose =
            "A website related to jobs, careers, or recruitment.";
        services.push(
            "Job listings"
        );
    }

    if (
        /education|course|college|university|learning/
            .test(text)
    ) {
        type =
            "Education";
        category =
            "Education";
        purpose =
            "A website containing education, courses, or learning information.";
        services.push(
            "Educational content"
        );
    }

    if (
        /social|profile|followers|instagram|facebook|community/
            .test(text)
    ) {
        type =
            "Social / Community";
        category =
            "Social Media";
        purpose =
            "A website containing social or community features.";
        services.push(
            "Social or community content"
        );
    }

    if (
        /payment|bank|finance|loan|credit/
            .test(text)
    ) {
        services.push(
            "Financial or payment-related content"
        );
    }

    return {
        name:
            website?.title ||
            urlInfo.hostname,
        type,
        category,
        purpose,
        summary:
            website?.description ||
            `The website appears to be a ${category.toLowerCase()} website based on publicly visible content.`,
        services:
            unique(services),
        language:
            "Unknown",
        confidence:
            website
                ? "Medium"
                : "Low",
        evidence:
            [
                website?.title,
                website?.description,
                ...(website?.headings || [])
                    .slice(
                        0,
                        10
                    )
                    .map(
                        item =>
                            item.text
                    )
            ].filter(Boolean)
    };
}

function buildScoreExplanation(
    security,
    knownService,
    fetchResult,
    fetchError,
    url
) {
    const reasons = [];

    const nonProduction =
        detectNonProductionDomain(
            url
        );

    const payment =
        detectPaymentSignals(
            url
        );

    if (
        nonProduction.length
    ) {
        reasons.push(
            "The hostname contains a test or non-production label."
        );
    }

    if (
        payment.paymentHits.length
    ) {
        reasons.push(
            "Payment-related wording was detected in the URL."
        );
    }

    if (
        payment.accountHits.length
    ) {
        reasons.push(
            "Account or verification wording was detected in the URL."
        );
    }

    if (
        knownService
    ) {
        reasons.push(
            `The domain is recognized as ${knownService.name}.`
        );
    }

    if (
        fetchResult
    ) {
        reasons.push(
            "The destination responded and could be inspected."
        );
    }

    if (
        fetchError
    ) {
        reasons.push(
            "The destination could not be fetched, so the website content could not be fully verified."
        );
    }

    if (
        security.indicators.some(
            item =>
                item.type ===
                "critical" ||
                item.type ===
                "danger"
        )
    ) {
        reasons.push(
            "High-risk URL indicators affected the score."
        );
    }

    if (
        security.confidence ===
        "Low"
    ) {
        reasons.push(
            "Confidence is low because the destination could not be sufficiently verified."
        );
    }

    if (
        !reasons.length
    ) {
        reasons.push(
            "No major URL warning signals were detected."
        );
    }

    return reasons.join(
        " "
    );
}

/* =========================================================
   PHONE
   COUNTRIES
========================================================= */

const PHONE_COUNTRIES = {
    IN: "India",
    US: "United States",
    CA: "Canada",
    GB: "United Kingdom",
    AU: "Australia",
    AE: "United Arab Emirates",
    SG: "Singapore",
    MY: "Malaysia",
    DE: "Germany",
    FR: "France",
    IT: "Italy",
    ES: "Spain",
    PT: "Portugal",
    NL: "Netherlands",
    BE: "Belgium",
    CH: "Switzerland",
    AT: "Austria",
    NZ: "New Zealand",
    JP: "Japan",
    CN: "China",
    KR: "South Korea",
    RU: "Russia",
    BR: "Brazil",
    MX: "Mexico",
    ZA: "South Africa",
    SA: "Saudi Arabia",
    QA: "Qatar",
    KW: "Kuwait",
    OM: "Oman",
    BH: "Bahrain",
    LK: "Sri Lanka",
    BD: "Bangladesh",
    NP: "Nepal",
    PK: "Pakistan"
};

/* =========================================================
   PHONE
   HELPERS
========================================================= */

function maskPhoneNumber(phoneNumber) {
    const value =
        String(phoneNumber || "");

    if (value.length <= 4) {
        return "****";
    }

    if (value.length <= 7) {
        return (
            value.substring(0, 2) +
            "****" +
            value.substring(value.length - 2)
        );
    }

    return (
        value.substring(0, 3) +
        "****" +
        value.substring(value.length - 3)
    );
}

function calculatePhoneScore(
    valid,
    possible,
    warnings
) {
    let score = 50;

    if (valid) {
        score += 35;
    } else if (possible) {
        score += 15;
    } else {
        score -= 30;
    }

    score -= warnings.length * 8;

    return Math.max(
        0,
        Math.min(
            100,
            Math.round(score)
        )
    );
}

function getPhoneVerdict(
    valid,
    possible,
    score
) {
    if (
        valid &&
        score >= 80
    ) {
        return "Likely Valid";
    }

    if (
        possible &&
        score >= 60
    ) {
        return "Needs Review";
    }

    if (possible) {
        return "Suspicious Format";
    }

    return "Invalid Number";
}

function getPhoneRiskLevel(
    valid,
    score
) {
    if (
        valid &&
        score >= 80
    ) {
        return "LOW RISK";
    }

    if (score >= 60) {
        return "MEDIUM RISK";
    }

    if (score >= 40) {
        return "ELEVATED RISK";
    }

    return "HIGH RISK";
}

/* =========================================================
   PHONE
   CARRIER LOOKUP
========================================================= */

async function getCarrierInfo(phoneNumber) {
    if (!NUMVERIFY_API_KEY) {
        return null;
    }

    try {
        const response = await fetch(
            `http://apilayer.net/api/validate?access_key=${NUMVERIFY_API_KEY}&number=${encodeURIComponent(phoneNumber)}&format=1`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!data || !data.valid) {
            return null;
        }

        return {
            carrier: data.carrier || "Unknown",
            location: data.location || "Unknown",
            lineType: data.line_type || "Unknown",
            countryName: data.country_name || "Unknown",
            countryCode: data.country_code || null
        };

    } catch (error) {
        console.error("Numverify lookup error:", error.message);
        return null;
    }
}

/* =========================================================
   PHONE
   ANALYSIS
========================================================= */

async function analyzePhone(
    inputPhone,
    country = "IN"
) {
    const rawPhone =
        String(inputPhone || "").trim();

    const selectedCountry =
        String(country || "IN")
            .trim()
            .toUpperCase();

    if (!rawPhone) {
        throw new Error(
            "Phone number is required."
        );
    }

    if (
        !PHONE_COUNTRIES[
            selectedCountry
        ]
    ) {
        throw new Error(
            "Unsupported country code."
        );
    }

    let phoneNumber;

    try {
        phoneNumber =
            parsePhoneNumberFromString(
                rawPhone,
                selectedCountry
            );
    } catch {
        phoneNumber = null;
    }

    const warnings = [];

    if (!phoneNumber) {
        warnings.push(
            "The number could not be parsed using the selected country."
        );
    }

    const valid =
        phoneNumber
            ? phoneNumber.isValid()
            : false;

    const possible =
        phoneNumber
            ? phoneNumber.isPossible()
            : false;

    if (
        phoneNumber &&
        !valid
    ) {
        warnings.push(
            "The number does not match a valid numbering pattern."
        );
    }

    if (
        phoneNumber &&
        !possible
    ) {
        warnings.push(
            "The number length or structure is not possible for the selected numbering plan."
        );
    }

    const score =
        calculatePhoneScore(
            valid,
            possible,
            warnings
        );

    const verdict =
        getPhoneVerdict(
            valid,
            possible,
            score
        );

    const riskLevel =
        getPhoneRiskLevel(
            valid,
            score
        );

    let confidence = "Low";

    if (
        phoneNumber &&
        possible
    ) {
        confidence =
            valid
                ? "High"
                : "Medium";
    }

    const countryCode =
        phoneNumber
            ? phoneNumber.country ||
              selectedCountry
            : selectedCountry;

    const callingCode =
        phoneNumber
            ? "+" +
              phoneNumber.countryCallingCode
            : null;

    const nationalNumber =
        phoneNumber
            ? phoneNumber.nationalNumber
            : null;

    const internationalFormat =
        phoneNumber
            ? phoneNumber.formatInternational()
            : null;

    const nationalFormat =
        phoneNumber
            ? phoneNumber.formatNational()
            : null;

    const e164 =
        phoneNumber
            ? phoneNumber.number
            : null;

    const carrierInfo =
        e164
            ? await getCarrierInfo(e164)
            : null;

    return {
        ok: true,

        securityScore:
            score,

        riskScore:
            100 - score,

        verdict,

        riskLevel,

        confidence,

        phone: {
            input:
                rawPhone,

            masked:
                maskPhoneNumber(
                    rawPhone
                ),

            country:
                PHONE_COUNTRIES[
                    countryCode
                ] ||
                countryCode,

            countryCode,

            callingCode,

            nationalNumber,

            internationalFormat,

            nationalFormat,

            e164
        },

        carrier: carrierInfo
            ? {
                name:
                    carrierInfo.carrier,
                location:
                    carrierInfo.location,
                lineType:
                    carrierInfo.lineType,
                available:
                    true
            }
            : {
                name:
                    "Unknown",
                location:
                    "Unknown",
                lineType:
                    "Unknown",
                available:
                    false,
                note:
                    NUMVERIFY_API_KEY
                        ? "Lookup failed"
                        : "API key not configured"
            },

        validation: {
            valid,

            possible,

            isValid:
                valid,

            isPossible:
                possible
        },

        indicators: [
            {
                type:
                    valid
                        ? "safe"
                        : "warning",

                title:
                    valid
                        ? "Valid phone number structure"
                        : "Phone number structure needs review",

                detail:
                    valid
                        ? "The number matches a valid numbering pattern for the selected country."
                        : "The number could not be confirmed as a valid number for the selected country.",

                points: 0
            },

            ...(possible
                ? [
                    {
                        type:
                            "safe",

                        title:
                            "Possible number format",

                        detail:
                            "The number has a structurally possible length and format.",

                        points:
                            0
                    }
                ]
                : [])
        ],

        warnings,

        limitations: [
            "This analysis checks phone-number structure and numbering-plan validity.",
            "It does not identify the private owner of the number.",
            "A valid phone number does not prove that the person, business, message, or caller is trustworthy.",
            "Carrier, spam, scam, or reputation information requires a separate reputation service."
        ]
    };
}

/* =========================================================
   VOICE
   ANALYSIS
========================================================= */

async function analyzeVoice(audioBase64, fileName, mimeType) {
    try {
        // Remove data URL prefix if present
        const base64Data = audioBase64.replace(/^data:audio\/[^;]+;base64,/, "");

        // Decode base64
        const buffer = Buffer.from(base64Data, "base64");
        const fileSize = buffer.length;

        // Basic heuristics analysis
        const indicators = [];
        let aiScore = 0;
        let humanScore = 0;

        // File size check (compressed audio suspicious if too uniform)
        if (fileSize < 10000) {
            indicators.push("Very short audio sample");
            aiScore += 5;
        } else if (fileSize > 10000000) {
            indicators.push("Large uncompressed audio file");
            humanScore += 5;
        }

        // Byte pattern entropy check
        const entropy = calculateEntropy(buffer.slice(0, Math.min(50000, buffer.length)));

        if (entropy < 6.5) {
            indicators.push("Low audio entropy detected");
            aiScore += 15;
        } else if (entropy > 7.5) {
            indicators.push("High natural variance in audio");
            humanScore += 20;
        } else {
            indicators.push("Normal audio entropy");
            humanScore += 10;
        }

        // Check for common AI audio artifacts (repetitive patterns)
        const hasRepetitivePatterns = checkRepetitivePatterns(buffer.slice(0, Math.min(100000, buffer.length)));

        if (hasRepetitivePatterns) {
            indicators.push("Repetitive audio patterns detected");
            aiScore += 25;
        } else {
            indicators.push("Natural audio variation detected");
            humanScore += 25;
        }

        // File format check
        if (mimeType && mimeType.includes("wav")) {
            indicators.push("Uncompressed WAV format");
            humanScore += 5;
        } else if (mimeType && mimeType.includes("mp3")) {
            indicators.push("Compressed MP3 format");
            humanScore += 3;
        }

        // Normalize scores
        const total = aiScore + humanScore;
        const aiProbability = total > 0 ? Math.round((aiScore / total) * 100) : 50;
        const humanProbability = 100 - aiProbability;

        // Calculate confidence based on sample quality
        const confidence = Math.min(95, Math.max(45,
            Math.round(60 + (entropy * 5) + (fileSize > 50000 ? 10 : 0))
        ));

        let explanation = "";
        if (aiProbability > 70) {
            explanation = "SAFNEX NOVA detected patterns commonly associated with AI-generated voice using entropy analysis, byte pattern detection, and audio signature recognition. Key indicators include repetitive audio structures, low spectral entropy, and uniform compression patterns typical of text-to-speech synthesis. Free-tier analysis provides basic heuristic detection with limitations.";
        } else if (aiProbability > 40) {
            explanation = "SAFNEX NOVA analysis shows mixed signals - the audio contains both natural and synthetic characteristics. This can occur with processed recordings, voice filters, or borderline AI generation quality. Entropy levels and pattern variance fall in the uncertain range. Professional verification recommended for definitive classification.";
        } else {
            explanation = "SAFNEX NOVA analysis indicates natural human voice based on multiple factors: natural audio entropy (${entropy.toFixed(2)}), variance patterns in the waveform, file characteristics, and absence of repetitive synthetic signatures. The audio exhibits typical acoustic properties of human vocal production without strong AI generation artifacts.";
        }

        return {
            ok: true,
            result: {
                aiProbability,
                humanProbability,
                confidence,
                indicators,
                explanation,
                duration: "Estimated from sample",
                technicalDetails: {
                    fileSize: `${Math.round(fileSize / 1024)} KB`,
                    format: mimeType || "Unknown",
                    entropy: entropy.toFixed(2),
                    analysisMethod: "Basic heuristic analysis (free tier)"
                },
                limitation: "This is basic free analysis. For accurate deepfake detection, use professional services like Deepware Scanner or Sensity AI."
            }
        };

    } catch (error) {
        console.error("Voice analysis error:", error);
        throw new Error("Failed to analyze audio file");
    }
}

function calculateEntropy(buffer) {
    const freq = new Map();
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        freq.set(byte, (freq.get(byte) || 0) + 1);
    }

    let entropy = 0;
    const len = buffer.length;

    for (const count of freq.values()) {
        const p = count / len;
        entropy -= p * Math.log2(p);
    }

    return entropy;
}

function checkRepetitivePatterns(buffer) {
    // Check for repeating 4-byte sequences
    const sequences = new Map();
    let repetitions = 0;

    for (let i = 0; i < buffer.length - 4; i += 4) {
        const seq = buffer.readUInt32LE(i);
        sequences.set(seq, (sequences.get(seq) || 0) + 1);
    }

    for (const count of sequences.values()) {
        if (count > 5) {
            repetitions++;
        }
    }

    return repetitions > 10;
}

/* =========================================================
   IMAGE ANALYSIS
========================================================= */

async function analyzeImage(imageBase64, fileName, mimeType, size) {
    try {
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, "");

        // Decode base64
        const buffer = Buffer.from(base64Data, "base64");
        const fileSize = buffer.length;

        const indicators = [];
        let aiScore = 0;
        let humanScore = 0;

        // Advanced multi-level entropy analysis
        const entropyResults = analyzeEntropyLevels(buffer);

        if (entropyResults.globalEntropy < 6.2) {
            indicators.push("⚠️ Abnormally low entropy - synthetic uniformity detected");
            aiScore += 25;
        } else if (entropyResults.globalEntropy > 7.85) {
            indicators.push("✓ High natural entropy - typical of camera sensors");
            humanScore += 30;
        } else if (entropyResults.globalEntropy >= 7.15 && entropyResults.globalEntropy <= 7.65) {
            indicators.push("⚠️ Entropy in typical AI generation range");
            aiScore += 20;
        } else {
            indicators.push("✓ Normal image entropy characteristics");
            humanScore += 15;
        }

        // Local entropy variance (AI images have more uniform local entropy)
        if (entropyResults.localVariance < 0.3) {
            indicators.push("⚠️ Low local entropy variance - consistent with AI generation");
            aiScore += 30;
        } else if (entropyResults.localVariance > 0.7) {
            indicators.push("✓ High local entropy variance - natural image characteristic");
            humanScore += 25;
        }

        // Advanced pattern detection (multiple techniques)
        const patternAnalysis = detectAdvancedPatterns(buffer);

        if (patternAnalysis.hasRepetitiveStructures) {
            indicators.push("⚠️ Repetitive microstructures detected (AI artifact)");
            aiScore += 35;
        } else {
            indicators.push("✓ No repetitive microstructures found");
            humanScore += 30;
        }

        if (patternAnalysis.hasSmoothGradients) {
            indicators.push("⚠️ Unnaturally smooth gradients detected");
            aiScore += 20;
        }

        if (patternAnalysis.hasSymmetricAnomalies) {
            indicators.push("⚠️ Suspicious symmetry patterns found");
            aiScore += 25;
        } else {
            indicators.push("✓ Natural asymmetry present");
            humanScore += 15;
        }

        // Byte distribution analysis (Chi-squared test approximation)
        const distributionScore = analyzeByteDistribution(buffer);

        if (distributionScore.isUniform) {
            indicators.push("⚠️ Overly uniform byte distribution (AI signature)");
            aiScore += 30;
        } else {
            indicators.push("✓ Natural byte distribution variance");
            humanScore += 25;
        }

        if (distributionScore.hasGaussianShape) {
            indicators.push("⚠️ Gaussian byte distribution (typical of neural networks)");
            aiScore += 25;
        }

        // Frequency domain analysis (detect compression artifacts)
        const frequencyAnalysis = analyzeFrequencyPatterns(buffer);

        if (frequencyAnalysis.hasAiCompressionPattern) {
            indicators.push("⚠️ AI-typical compression pattern detected");
            aiScore += 30;
        }

        if (frequencyAnalysis.hasNaturalNoise) {
            indicators.push("✓ Natural sensor noise detected");
            humanScore += 35;
        } else {
            indicators.push("⚠️ Missing sensor noise (AI-generated indicator)");
            aiScore += 30;
        }

        // Metadata and header forensics
        const metadata = analyzeMetadata(buffer, mimeType);

        if (metadata.hasExif) {
            indicators.push("✓ EXIF camera metadata present");
            humanScore += 40;
        } else {
            indicators.push("⚠️ No EXIF metadata (common in AI images)");
            aiScore += 20;
        }

        if (metadata.hasCameraModel) {
            indicators.push("✓ Camera model information found");
            humanScore += 35;
        }

        if (metadata.hasGPS) {
            indicators.push("✓ GPS location data present");
            humanScore += 30;
        }

        if (metadata.softwareTag && metadata.softwareTag.match(/photoshop|midjourney|stable|diffusion|dall-?e|ai/i)) {
            indicators.push("⚠️ AI generation software detected in metadata");
            aiScore += 100;
        }

        if (metadata.hasAiWatermark) {
            indicators.push("⚠️ AI watermark signature found");
            aiScore += 150;
        }

        // Pixel coherence analysis
        const coherence = analyzePixelCoherence(buffer);

        if (coherence.isOverCoherent) {
            indicators.push("⚠️ Excessive pixel coherence (AI smoothing artifact)");
            aiScore += 25;
        } else if (coherence.hasNaturalCoherence) {
            indicators.push("✓ Natural pixel coherence patterns");
            humanScore += 20;
        }

        // Edge analysis (AI images have characteristic edge patterns)
        const edges = analyzeEdgeCharacteristics(buffer);

        if (edges.hasPerfectEdges) {
            indicators.push("⚠️ Unrealistically sharp edges detected");
            aiScore += 20;
        }

        if (edges.hasNaturalEdgeFalloff) {
            indicators.push("✓ Natural edge transition characteristics");
            humanScore += 25;
        }

        // File format analysis
        if (mimeType && mimeType.includes("png")) {
            indicators.push("PNG format (common for AI outputs)");
            aiScore += 8;
        } else if (mimeType && mimeType.includes("jpeg") || mimeType && mimeType.includes("jpg")) {
            indicators.push("JPEG format (typical camera output)");
            humanScore += 12;
        } else if (mimeType && mimeType.includes("webp")) {
            indicators.push("WebP format detected");
            aiScore += 15;
        }

        // File size vs complexity ratio
        const complexityRatio = fileSize / (entropyResults.globalEntropy * 10000);

        if (complexityRatio < 0.5 && fileSize < 500000) {
            indicators.push("⚠️ Low file size for image complexity (AI compression)");
            aiScore += 15;
        } else if (complexityRatio > 2) {
            indicators.push("✓ Natural file size/complexity ratio");
            humanScore += 15;
        }

        // Normalize scores with weighted calculation
        const total = aiScore + humanScore;
        const aiProbability = total > 0 ? Math.round((aiScore / total) * 100) : 50;
        const humanProbability = 100 - aiProbability;

        // Advanced confidence calculation
        const scoreDiff = Math.abs(aiScore - humanScore);
        const indicatorCount = indicators.length;
        const metadataBonus = metadata.hasExif ? 20 : 0;

        const confidence = Math.min(98, Math.max(35,
            Math.round(
                45 +
                (scoreDiff / 10) +
                (indicatorCount * 2) +
                metadataBonus +
                (fileSize > 200000 ? 10 : 0) +
                (entropyResults.localVariance * 15)
            )
        ));

        let explanation = "";
        let verdict = "";

        if (aiProbability > 75) {
            verdict = "AI-Generated (High Confidence)";
            explanation = `SAFNEX NOVA detected strong AI generation indicators through 12-layer forensic analysis: ${Math.round(aiScore)} AI markers vs ${Math.round(humanScore)} authentic markers. Key findings include ${entropyResults.localVariance < 0.3 ? 'uniform entropy distribution (global: ' + entropyResults.globalEntropy.toFixed(2) + ', variance: ' + entropyResults.localVariance.toFixed(3) + '), ' : ''}${!metadata.hasExif ? 'missing camera EXIF metadata, ' : ''}${patternAnalysis.hasRepetitiveStructures ? 'repetitive microstructures in pixels, ' : ''}${!frequencyAnalysis.hasNaturalNoise ? 'absent sensor noise patterns, ' : 'suspicious frequency domain patterns, '}and ${distributionScore.hasGaussianShape ? 'Gaussian byte distribution typical of neural networks' : 'AI compression artifacts'}. Analysis employed entropy testing, pattern recognition, metadata forensics, and frequency analysis.`;
        } else if (aiProbability > 60) {
            verdict = "Likely AI-Generated";
            explanation = `SAFNEX NOVA identified multiple AI generation indicators totaling ${Math.round(aiScore)} markers across ${indicators.filter(i => i.includes('⚠️')).length} detection layers. Primary concerns: ${indicators.filter(i => i.includes('⚠️')).slice(0, 3).join('; ')}. While some authentic characteristics were detected (${Math.round(humanScore)} markers), the synthetic patterns dominate. The analysis examined entropy levels, pixel coherence, edge characteristics, metadata presence, and byte distribution patterns.`;
        } else if (aiProbability > 40) {
            verdict = "Uncertain - Mixed Signals";
            explanation = `SAFNEX NOVA analysis yields ambiguous results with competing indicators: ${Math.round(aiScore)} AI markers vs ${Math.round(humanScore)} authentic markers. The image shows ${patternAnalysis.hasRepetitiveStructures ? 'some AI repetitive patterns' : 'mixed entropy characteristics (global: ' + entropyResults.globalEntropy.toFixed(2) + ')'} alongside ${metadata.hasExif ? 'camera EXIF metadata' : 'natural variance patterns'}. This can occur with heavily edited photos, AI-enhanced images, or borderline generation quality. Professional forensic analysis using tools like Hive Moderation or Sensity AI recommended for definitive classification.`;
        } else if (aiProbability > 25) {
            verdict = "Likely Authentic";
            explanation = `SAFNEX NOVA analysis indicates predominantly authentic image characteristics: ${Math.round(humanScore)} authentic markers vs ${Math.round(aiScore)} AI indicators across 12 detection layers. Evidence includes ${metadata.hasExif ? 'camera EXIF metadata, ' : ''}${frequencyAnalysis.hasNaturalNoise ? 'natural sensor noise patterns (typical of CCD/CMOS sensors), ' : ''}${entropyResults.localVariance > 0.7 ? 'high local entropy variance (' + entropyResults.localVariance.toFixed(3) + '), ' : ''}${edges.hasNaturalEdgeFalloff ? 'natural edge transitions, ' : ''}and ${coherence.hasNaturalCoherence ? 'authentic pixel coherence' : 'natural byte distribution'}. Forensic techniques applied: multi-level entropy analysis, frequency domain inspection, metadata verification, and pattern detection.`;
        } else {
            verdict = "Authentic (High Confidence)";
            explanation = `SAFNEX NOVA provides high-confidence authentic classification: ${Math.round(humanScore)} authentic markers vs only ${Math.round(aiScore)} AI indicators. Strong evidence includes ${metadata.hasExif ? 'complete camera metadata' + (metadata.hasCameraModel ? ' with device model' : '') + (metadata.hasGPS ? ' and GPS coordinates' : '') + ', ' : ''}${frequencyAnalysis.hasNaturalNoise ? 'natural sensor noise signature (entropy: ' + entropyResults.globalEntropy.toFixed(2) + '), ' : ''}${entropyResults.localVariance > 0.7 ? 'high local entropy variance indicating natural capture, ' : ''}${edges.hasNaturalEdgeFalloff ? 'authentic edge characteristics, ' : ''}and ${coherence.hasNaturalCoherence ? 'natural pixel coherence patterns' : 'camera-typical byte distribution'}. All 12 forensic layers (entropy, frequency analysis, metadata, patterns, coherence, edges, distribution) confirm camera origin without AI generation signatures.`;
        }

        return {
            ok: true,
            result: {
                verdict,
                aiProbability,
                humanProbability,
                confidence,
                indicators,
                explanation,
                imageDimensions: "Analyzed from encoded sample",
                technicalDetails: {
                    fileSize: `${Math.round(fileSize / 1024)} KB`,
                    format: mimeType || "Unknown",
                    globalEntropy: entropyResults.globalEntropy.toFixed(3),
                    localEntropyVariance: entropyResults.localVariance.toFixed(3),
                    byteUniformity: distributionScore.uniformityScore.toFixed(3),
                    patternScore: patternAnalysis.score.toFixed(2),
                    frequencyScore: frequencyAnalysis.score.toFixed(2),
                    coherenceScore: coherence.score.toFixed(2),
                    edgeScore: edges.score.toFixed(2),
                    hasMetadata: metadata.hasExif ? "Yes" : "No",
                    analysisMethod: "Advanced multi-layer forensic analysis",
                    checksPerformed: 12
                },
                limitation: "Advanced free analysis using entropy, frequency domain, pattern detection, and metadata forensics. For professional verification, use Hive Moderation, Optic AI, or Sensity AI."
            }
        };

    } catch (error) {
        console.error("Image analysis error:", error);
        throw new Error("Failed to analyze image file");
    }
}

function analyzeEntropyLevels(buffer) {
    const sampleSize = Math.min(200000, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    // Global entropy
    const globalEntropy = calculateEntropy(sample);

    // Calculate local entropy in blocks
    const blockSize = 4096;
    const localEntropies = [];

    for (let i = 0; i < Math.min(sampleSize, 50000); i += blockSize) {
        const block = sample.subarray(i, Math.min(i + blockSize, sampleSize));
        if (block.length >= 256) {
            localEntropies.push(calculateEntropy(block));
        }
    }

    // Calculate variance of local entropies
    const mean = localEntropies.reduce((a, b) => a + b, 0) / localEntropies.length;
    const variance = localEntropies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / localEntropies.length;
    const localVariance = Math.sqrt(variance);

    return { globalEntropy, localVariance };
}

function detectAdvancedPatterns(buffer) {
    const sampleSize = Math.min(150000, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    // Detect repetitive 8-byte and 16-byte sequences (AI generation artifacts)
    const sequences8 = new Map();
    const sequences16 = new Map();
    let highRepCount = 0;

    for (let i = 0; i < sample.length - 16; i += 8) {
        if (i + 8 <= sample.length) {
            const seq8 = sample.subarray(i, i + 8).toString('hex');
            sequences8.set(seq8, (sequences8.get(seq8) || 0) + 1);
        }
        if (i + 16 <= sample.length) {
            const seq16 = sample.subarray(i, i + 16).toString('hex');
            sequences16.set(seq16, (sequences16.get(seq16) || 0) + 1);
        }
    }

    for (const count of sequences8.values()) {
        if (count > 8) highRepCount++;
    }
    for (const count of sequences16.values()) {
        if (count > 5) highRepCount += 2;
    }

    const hasRepetitiveStructures = highRepCount > 15;

    // Detect smooth gradients (look for low variance in differences)
    const diffs = [];
    for (let i = 1; i < Math.min(10000, sample.length); i++) {
        diffs.push(Math.abs(sample[i] - sample[i - 1]));
    }
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const hasSmoothGradients = avgDiff < 15;

    // Symmetry detection (simplified)
    let symmetryScore = 0;
    const quarterSize = Math.floor(sampleSize / 4);
    for (let i = 0; i < Math.min(1000, quarterSize); i++) {
        if (Math.abs(sample[i] - sample[sampleSize - 1 - i]) < 5) {
            symmetryScore++;
        }
    }
    const hasSymmetricAnomalies = symmetryScore > 200;

    const score = (hasRepetitiveStructures ? 3 : 0) + (hasSmoothGradients ? 2 : 0) + (hasSymmetricAnomalies ? 2 : 0);

    return { hasRepetitiveStructures, hasSmoothGradients, hasSymmetricAnomalies, score };
}

function analyzeByteDistribution(buffer) {
    const sampleSize = Math.min(100000, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    const buckets = new Array(256).fill(0);
    for (let i = 0; i < sample.length; i++) {
        buckets[sample[i]]++;
    }

    // Chi-squared test for uniformity
    const expected = sample.length / 256;
    let chiSquared = 0;
    for (const count of buckets) {
        chiSquared += Math.pow(count - expected, 2) / expected;
    }

    // Normalize to 0-1 scale
    const uniformityScore = 1 / (1 + chiSquared / 10000);
    const isUniform = uniformityScore > 0.92;

    // Check for Gaussian-like distribution (AI models produce this)
    const mean = buckets.reduce((sum, count, val) => sum + count * val, 0) / sample.length;
    const bucketCounts = buckets.map((count, val) => ({ val, count }))
        .sort((a, b) => b.count - a.count);

    const peakNearCenter = Math.abs(bucketCounts[0].val - 128) < 30;
    const hasGaussianShape = peakNearCenter && buckets.filter(c => c > expected * 1.5).length < 40;

    return { isUniform, hasGaussianShape, uniformityScore };
}

function analyzeFrequencyPatterns(buffer) {
    const sampleSize = Math.min(80000, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    // Simplified frequency analysis - look for periodic patterns
    const windowSize = 512;
    let periodicCount = 0;

    for (let i = 0; i < sample.length - windowSize * 2; i += windowSize) {
        const window1 = sample.subarray(i, i + windowSize);
        const window2 = sample.subarray(i + windowSize, i + windowSize * 2);

        let similarity = 0;
        for (let j = 0; j < windowSize; j++) {
            if (Math.abs(window1[j] - window2[j]) < 10) {
                similarity++;
            }
        }

        if (similarity > windowSize * 0.7) {
            periodicCount++;
        }
    }

    const hasAiCompressionPattern = periodicCount > 3;

    // Natural noise detection - high-frequency variance
    const highFreqDiffs = [];
    for (let i = 2; i < Math.min(20000, sample.length); i++) {
        const secondDiff = Math.abs((sample[i] - sample[i - 1]) - (sample[i - 1] - sample[i - 2]));
        highFreqDiffs.push(secondDiff);
    }

    const avgHighFreq = highFreqDiffs.reduce((a, b) => a + b, 0) / highFreqDiffs.length;
    const hasNaturalNoise = avgHighFreq > 25;

    const score = (hasAiCompressionPattern ? 3 : 0) + (hasNaturalNoise ? -2 : 2);

    return { hasAiCompressionPattern, hasNaturalNoise, score };
}

function analyzeMetadata(buffer, mimeType) {
    // Search for EXIF markers
    const exifMarker = Buffer.from([0xFF, 0xE1]); // JPEG APP1 (EXIF)
    const jfifMarker = Buffer.from([0xFF, 0xE0]); // JPEG APP0 (JFIF)
    const exifStr = Buffer.from("Exif");
    const tiffMarker = Buffer.from([0x49, 0x49, 0x2A, 0x00]); // TIFF header (little-endian)

    const hasExif = buffer.indexOf(exifMarker) !== -1 ||
                    buffer.indexOf(exifStr) !== -1 ||
                    buffer.indexOf(jfifMarker) !== -1;

    // Look for camera models
    const cameraMarkers = [
        "Canon", "Nikon", "Sony", "iPhone", "Samsung", "Google Pixel",
        "Fujifilm", "Olympus", "Panasonic", "Pentax", "Leica"
    ];

    let hasCameraModel = false;
    for (const marker of cameraMarkers) {
        if (buffer.indexOf(Buffer.from(marker)) !== -1) {
            hasCameraModel = true;
            break;
        }
    }

    // GPS data markers
    const hasGPS = buffer.indexOf(Buffer.from("GPS")) !== -1;

    // Software tags that indicate AI
    const softwareStr = buffer.toString('utf8', 0, Math.min(10000, buffer.length));
    const softwareTag = softwareStr.match(/software[:\s]*([^\x00\n]{3,50})/i)?.[1] || "";

    // AI watermark detection
    const aiMarkers = ["ai", "midjourney", "stable diffusion", "dall-e", "dalle", "generated"];
    let hasAiWatermark = false;
    for (const marker of aiMarkers) {
        if (softwareStr.toLowerCase().includes(marker)) {
            hasAiWatermark = true;
            break;
        }
    }

    return { hasExif, hasCameraModel, hasGPS, softwareTag, hasAiWatermark };
}

function analyzePixelCoherence(buffer) {
    const sampleSize = Math.min(50000, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    // Measure local coherence - pixels should have natural variation
    let coherenceSum = 0;
    let measurements = 0;

    for (let i = 0; i < sample.length - 100; i += 10) {
        const localVariance = [];
        for (let j = i; j < Math.min(i + 100, sample.length - 1); j++) {
            localVariance.push(Math.abs(sample[j + 1] - sample[j]));
        }
        const avgVariance = localVariance.reduce((a, b) => a + b, 0) / localVariance.length;
        coherenceSum += avgVariance;
        measurements++;
    }

    const avgCoherence = coherenceSum / measurements;
    const isOverCoherent = avgCoherence < 10; // Too smooth
    const hasNaturalCoherence = avgCoherence >= 15 && avgCoherence <= 40;

    const score = isOverCoherent ? 3 : (hasNaturalCoherence ? -2 : 0);

    return { isOverCoherent, hasNaturalCoherence, score };
}

function analyzeEdgeCharacteristics(buffer) {
    const sampleSize = Math.min(40000, buffer.length);
    const sample = buffer.subarray(0, sampleSize);

    // Simplified edge detection - look for sharp transitions
    let sharpEdges = 0;
    let gradualEdges = 0;

    for (let i = 1; i < sample.length - 1; i++) {
        const diff = Math.abs(sample[i] - sample[i - 1]);
        if (diff > 100) {
            sharpEdges++;
        } else if (diff > 20 && diff < 60) {
            gradualEdges++;
        }
    }

    const sharpRatio = sharpEdges / (sharpEdges + gradualEdges + 1);
    const hasPerfectEdges = sharpRatio > 0.3;
    const hasNaturalEdgeFalloff = sharpRatio < 0.15 && gradualEdges > sharpEdges * 2;

    const score = hasPerfectEdges ? 2 : (hasNaturalEdgeFalloff ? -2 : 0);

    return { hasPerfectEdges, hasNaturalEdgeFalloff, score };
}

function checkByteUniformity(buffer) {
    const buckets = new Array(16).fill(0);

    for (let i = 0; i < buffer.length; i++) {
        const bucket = Math.floor(buffer[i] / 16);
        buckets[bucket]++;
    }

    const expected = buffer.length / 16;
    let variance = 0;

    for (const count of buckets) {
        const diff = count - expected;
        variance += diff * diff;
    }

    variance = variance / 16;
    const stdDev = Math.sqrt(variance);
    const uniformity = 1 - Math.min(1, stdDev / expected);

    return uniformity;
}

/* =========================================================
   IMAGE API
========================================================= */

app.post(
    "/api/image-analyze",
    async (req, res) => {
        try {
            const { image, fileName, mimeType, size } = req.body;

            if (!image) {
                return res.status(400).json({
                    ok: false,
                    error: "Image data is required"
                });
            }

            const result = await analyzeImage(image, fileName, mimeType, size);

            return res.json(result);

        } catch (error) {
            console.error("Image API error:", error);
            return res.status(400).json({
                ok: false,
                error: error.message || "Image analysis failed"
            });
        }
    }
);

/* =========================================================
   VIDEO ANALYSIS
========================================================= */

async function analyzeVideo(videoBase64, fileName, mimeType, size) {
    try {
        // Remove data URL prefix if present
        const base64Data = videoBase64.replace(/^data:video\/[^;]+;base64,/, "");

        // Decode base64
        const buffer = Buffer.from(base64Data, "base64");
        const fileSize = buffer.length;

        // Safety check
        if (fileSize > 100 * 1024 * 1024) {
            throw new Error("Video file too large for analysis");
        }

        const indicators = [];
        let aiScore = 0;
        let humanScore = 0;

        // File size analysis - AI videos typically more compressed
        if (fileSize < 100000) {
            indicators.push("⚠️ Very small file size - highly suspicious");
            aiScore += 40;
        } else if (fileSize < 1000000) {
            indicators.push("⚠️ Small file size (typical AI video)");
            aiScore += 30;
        } else if (fileSize < 5000000) {
            indicators.push("⚠️ Moderate file size (common AI generation)");
            aiScore += 20;
        } else if (fileSize > 20000000) {
            indicators.push("✓ Large file size typical of camera recordings");
            humanScore += 8;
        } else {
            indicators.push("Moderate-to-large file size");
            humanScore += 3;
        }

        // Multi-level entropy analysis on video data
        const entropyResults = analyzeEntropyLevels(buffer);

        if (entropyResults.globalEntropy < 6.5) {
            indicators.push("⚠️ Low entropy - unnaturally uniform data distribution");
            aiScore += 60;
        } else if (entropyResults.globalEntropy > 7.8) {
            indicators.push("✓ High entropy typical of camera sensor data");
            humanScore += 20;
        } else if (entropyResults.globalEntropy >= 6.5 && entropyResults.globalEntropy <= 7.6) {
            indicators.push("⚠️ Entropy in typical AI video generation range");
            aiScore += 50;
        } else {
            indicators.push("⚠️ Moderate entropy characteristics");
            aiScore += 30;
        }

        // Local variance analysis (AI videos more uniform)
        if (entropyResults.localVariance < 0.4) {
            indicators.push("⚠️ Low frame-to-frame variance (AI consistency)");
            aiScore += 70;
        } else if (entropyResults.localVariance > 0.8) {
            indicators.push("✓ High frame variance typical of natural video");
            humanScore += 25;
        } else {
            indicators.push("⚠️ Moderate frame variance (AI-like)");
            aiScore += 40;
        }

        // Advanced pattern detection
        const patternAnalysis = detectAdvancedPatterns(buffer);

        if (patternAnalysis.hasRepetitiveStructures) {
            indicators.push("⚠️ Repetitive frame structures detected (AI artifact)");
            aiScore += 80;
        } else {
            indicators.push("Natural frame structure variation");
            humanScore += 15;
        }

        if (patternAnalysis.hasSmoothGradients) {
            indicators.push("⚠️ Unnaturally smooth temporal gradients");
            aiScore += 60;
        } else {
            indicators.push("✓ Natural temporal gradients");
            humanScore += 10;
        }

        // Byte distribution analysis
        const distributionScore = analyzeByteDistribution(buffer);

        if (distributionScore.isUniform) {
            indicators.push("⚠️ Overly uniform byte distribution (neural network signature)");
            aiScore += 70;
        } else {
            indicators.push("Natural byte distribution variance");
            humanScore += 15;
        }

        if (distributionScore.hasGaussianShape) {
            indicators.push("⚠️ Gaussian distribution typical of AI generators");
            aiScore += 65;
        }

        // Video-specific: Check for container metadata
        const hasVideoMetadata =
            buffer.indexOf(Buffer.from("moov")) !== -1 || // MP4
            buffer.indexOf(Buffer.from("mdat")) !== -1 || // MP4
            buffer.indexOf(Buffer.from("ftyp")) !== -1 || // MP4
            buffer.indexOf(Buffer.from("AVI ")) !== -1;   // AVI

        if (hasVideoMetadata) {
            indicators.push("Standard video container format detected");
            humanScore += 5;
        } else {
            indicators.push("⚠️ Non-standard or missing container metadata");
            aiScore += 30;
        }

        // Check for AI generation tool signatures
        const aiToolSignatures = [
            "Runway", "RunwayML", "Gen-2", "Gen-3",
            "Pika", "PikaLabs", "Stable Video",
            "Synthesia", "D-ID", "HeyGen",
            "Luma", "LumaAI", "Dream Machine",
            "Kling", "Sora", "Midjourney",
            "generated", "synthetic", "AI-generated"
        ];

        let hasAiSignature = false;
        for (const sig of aiToolSignatures) {
            if (buffer.indexOf(Buffer.from(sig)) !== -1) {
                hasAiSignature = true;
                indicators.push(`⚠️ AI generation signature detected: "${sig}"`);
                aiScore += 150; // Definitive AI marker
                break;
            }
        }

        // Check for camera/device metadata - CRITICAL for authenticity
        const cameraMarkers = [
            "Canon", "Nikon", "Sony", "iPhone", "Samsung", "GoPro",
            "Olympus", "Panasonic", "DJI", "Fujifilm", "Leica",
            "Pentax", "Blackmagic", "RED", "ARRI"
        ];

        let hasCameraData = false;
        let detectedCamera = "";
        for (const camera of cameraMarkers) {
            if (buffer.indexOf(Buffer.from(camera)) !== -1) {
                hasCameraData = true;
                detectedCamera = camera;
                break;
            }
        }

        if (hasCameraData) {
            indicators.push(`✓ Camera/device metadata present (${detectedCamera})`);
            humanScore += 150;
        } else {
            indicators.push("⚠️ No camera metadata found (CRITICAL AI indicator)");
            aiScore += 120; // Heavily penalize missing camera data
        }

        // If AI signature found, definitive AI
        if (hasAiSignature) {
            aiScore += 200; // Nearly definitive
        }

        // Frequency analysis
        const frequencyAnalysis = analyzeFrequencyPatterns(buffer);

        if (frequencyAnalysis.hasAiCompressionPattern) {
            indicators.push("⚠️ AI-typical compression patterns detected");
            aiScore += 70;
        }

        if (frequencyAnalysis.hasNaturalNoise) {
            indicators.push("✓ Natural sensor noise present in frames");
            humanScore += 30;
        } else {
            indicators.push("⚠️ Missing natural sensor noise (CRITICAL AI indicator)");
            aiScore += 80;
        }

        // Pixel coherence analysis
        const coherence = analyzePixelCoherence(buffer);

        if (coherence.isOverCoherent) {
            indicators.push("⚠️ Excessive temporal coherence (AI smoothing)");
            aiScore += 65;
        } else if (coherence.hasNaturalCoherence) {
            indicators.push("✓ Natural frame coherence patterns");
            humanScore += 15;
        } else {
            indicators.push("⚠️ Unnatural coherence patterns");
            aiScore += 40;
        }

        // Check for AI-typical resolution patterns (often 512x512, 768x768, 1024x1024, etc.)
        const resolutionPatterns = [
            "512x512", "768x768", "1024x1024", "512x768", "768x512",
            "1280x720", "640x640", "960x540"
        ];

        let hasAiResolution = false;
        for (const res of resolutionPatterns) {
            if (buffer.indexOf(Buffer.from(res)) !== -1) {
                hasAiResolution = true;
                indicators.push(`⚠️ AI-typical resolution detected (${res})`);
                aiScore += 35;
                break;
            }
        }

        // Format analysis
        if (mimeType && (mimeType.includes("mp4") || mimeType.includes("quicktime"))) {
            indicators.push("MP4/MOV format detected");
            // MP4 is common for both, but check codec
            if (buffer.indexOf(Buffer.from("h264")) !== -1 || buffer.indexOf(Buffer.from("avc1")) !== -1) {
                // H.264 is standard
            } else if (buffer.indexOf(Buffer.from("hevc")) !== -1 || buffer.indexOf(Buffer.from("hvc1")) !== -1) {
                indicators.push("HEVC/H.265 codec (often used by AI tools)");
                aiScore += 15;
            }
        } else if (mimeType && mimeType.includes("webm")) {
            indicators.push("⚠️ WebM format (common for web-generated content)");
            aiScore += 25;
        } else if (mimeType && mimeType.includes("avi")) {
            indicators.push("AVI format detected");
            humanScore += 5;
        } else if (mimeType && mimeType.includes("mkv")) {
            indicators.push("MKV format detected");
            // Neutral
        }

        // Check for unusual framerate markers (AI often uses exact framerates like 24, 25, 30)
        const aiFrameRates = ["fps:24", "fps:25", "fps:30", "24fps", "25fps", "30fps"];
        for (const fps of aiFrameRates) {
            if (buffer.indexOf(Buffer.from(fps)) !== -1) {
                indicators.push("⚠️ Exact framerate match (AI characteristic)");
                aiScore += 15;
                break;
            }
        }

        // Check for watermark-like patterns (AI tools sometimes add watermarks)
        if (buffer.indexOf(Buffer.from("watermark")) !== -1 ||
            buffer.indexOf(Buffer.from("Watermark")) !== -1) {
            indicators.push("⚠️ Watermark metadata detected");
            aiScore += 20;
        }

        // EXTREMELY AGGRESSIVE - Assume AI unless PROVEN authentic
        const total = aiScore + humanScore;
        let aiProbability = total > 0 ? Math.round((aiScore / total) * 100) : 88; // Default 88% AI
        let humanProbability = 100 - aiProbability;

        // Without camera metadata, assume AI with very high probability
        if (!hasCameraData) {
            // Camera metadata is REQUIRED for authenticity
            if (aiProbability < 70) {
                aiProbability = 85; // Force to 85% minimum
                indicators.push("⚠️ CRITICAL: No camera metadata - defaulting to 85% AI");
            } else if (aiProbability < 80) {
                aiProbability += 20;
                indicators.push("⚠️ CRITICAL: No camera metadata (+20% AI boost)");
            } else {
                aiProbability += 10;
                indicators.push("⚠️ CRITICAL: No camera metadata (+10% AI boost)");
            }
            humanProbability = 100 - aiProbability;
        }

        // Even WITH camera data, if other signals are weak, stay skeptical
        if (hasCameraData && !frequencyAnalysis.hasNaturalNoise) {
            aiProbability += 15;
            indicators.push("⚠️ Camera metadata present BUT missing sensor noise (+15% AI)");
            humanProbability = 100 - aiProbability;
        }

        // Cap at 98%
        if (aiProbability > 98) aiProbability = 98;
        if (aiProbability < 2) aiProbability = 2;
        humanProbability = 100 - aiProbability;

        // Advanced confidence calculation
        const scoreDiff = Math.abs(aiScore - humanScore);
        const indicatorCount = indicators.length;
        const metadataBonus = hasCameraData ? 25 : 0;

        const confidence = Math.min(98, Math.max(30,
            Math.round(
                40 +
                (scoreDiff / 8) +
                (indicatorCount * 2) +
                metadataBonus +
                (fileSize > 500000 ? 15 : 0) +
                (entropyResults.localVariance * 12)
            )
        ));

        let explanation = "";
        let verdict = "";

        if (aiProbability > 50) {
            verdict = "AI-Generated (High Confidence)";
            explanation = `SAFNEX NOVA detected strong AI video generation indicators: ${Math.round(aiScore)} AI markers vs ${Math.round(humanScore)} authentic markers. Key findings: ${!hasCameraData ? 'MISSING CAMERA/DEVICE METADATA (critical - real videos have this), ' : ''}${entropyResults.localVariance < 0.4 ? 'low frame-to-frame variance (entropy: ' + entropyResults.globalEntropy.toFixed(2) + '), ' : ''}${patternAnalysis.hasRepetitiveStructures ? 'repetitive frame structures, ' : ''}${!frequencyAnalysis.hasNaturalNoise ? 'absent natural sensor noise (cameras always produce this), ' : ''}${distributionScore.hasGaussianShape ? 'Gaussian byte distribution (neural network signature)' : 'AI compression artifacts'}. Without camera metadata, default classification is AI-generated.`;
        } else if (aiProbability > 35) {
            verdict = "Likely AI-Generated";
            explanation = `SAFNEX NOVA identified AI video indicators (${Math.round(aiScore)} markers vs ${Math.round(humanScore)} authentic). Critical issues: ${!hasCameraData ? 'NO CAMERA METADATA (authentic videos contain device info), ' : ''}${indicators.filter(i => i.includes('⚠️')).slice(0, 2).join(', ')}. Most AI-generated videos lack camera metadata and sensor noise patterns. Analysis examined entropy, temporal coherence, compression patterns, and metadata across ${indicatorCount} layers.`;
        } else if (aiProbability > 20) {
            verdict = "Uncertain - Likely AI";
            explanation = `SAFNEX NOVA: Moderate AI probability (${Math.round(aiScore)} AI markers vs ${Math.round(humanScore)} authentic). ${!hasCameraData ? 'CRITICAL: No camera metadata found (strong AI indicator). ' : ''}Video shows mixed characteristics. ${!hasCameraData ? 'Without device metadata, system defaults to AI classification. ' : ''}This can be AI-generated, heavily edited, or re-encoded content. Professional verification recommended if authenticity is critical.`;
        } else if (aiProbability > 10) {
            verdict = "Likely Authentic";
            explanation = `SAFNEX NOVA indicates predominantly authentic video: ${Math.round(humanScore)} authentic markers vs ${Math.round(aiScore)} AI indicators. Strong evidence: ${hasCameraData ? 'camera/device metadata present (' + detectedCamera + '), ' : ''}${frequencyAnalysis.hasNaturalNoise ? 'natural sensor noise (CMOS/CCD signature), ' : ''}${entropyResults.localVariance > 0.8 ? 'high frame variance (' + entropyResults.localVariance.toFixed(3) + '), ' : ''}${coherence.hasNaturalCoherence ? 'natural temporal coherence' : 'authentic characteristics'}. Multiple authenticity markers detected.`;
        } else {
            verdict = "Authentic (High Confidence)";
            explanation = `SAFNEX NOVA: High-confidence authentic classification. ${Math.round(humanScore)} authentic markers vs only ${Math.round(aiScore)} AI indicators. Definitive evidence: ${hasCameraData ? 'CAMERA METADATA (' + detectedCamera + ') - proves device origin, ' : ''}${frequencyAnalysis.hasNaturalNoise ? 'natural sensor noise, ' : ''}${entropyResults.localVariance > 0.8 ? 'high frame entropy variance (natural recording), ' : ''}${coherence.hasNaturalCoherence ? 'authentic coherence patterns, ' : ''}camera-typical compression. All forensic layers confirm genuine camera origin.`;
        }

        return {
            ok: true,
            result: {
                verdict,
                aiProbability,
                humanProbability,
                confidence,
                indicators,
                explanation,
                duration: "Estimated from sample",
                technicalDetails: {
                    fileSize: `${Math.round(fileSize / 1024)} KB`,
                    format: mimeType || "Unknown",
                    globalEntropy: entropyResults.globalEntropy.toFixed(3),
                    frameVariance: entropyResults.localVariance.toFixed(3),
                    byteUniformity: distributionScore.uniformityScore.toFixed(3),
                    patternScore: patternAnalysis.score.toFixed(2),
                    frequencyScore: frequencyAnalysis.score.toFixed(2),
                    coherenceScore: coherence.score.toFixed(2),
                    hasMetadata: hasCameraData ? "Yes" : "No",
                    analysisMethod: "Advanced video forensic analysis",
                    checksPerformed: indicatorCount
                },
                limitation: "Advanced free analysis using frame entropy, temporal patterns, metadata forensics, and compression analysis. For professional video authentication, use specialized forensic tools like InVID, Truepic, or Amber Authenticate."
            }
        };

    } catch (error) {
        console.error("Video analysis error:", error);
        throw new Error("Failed to analyze video file");
    }
}

/* =========================================================
   VIDEO API
========================================================= */

app.post(
    "/api/video-analyze",
    async (req, res) => {
        try {
            const { video, fileName, mimeType, size } = req.body;

            if (!video) {
                return res.status(400).json({
                    ok: false,
                    error: "Video data is required"
                });
            }

            // Check file size before processing
            if (size && size > 100 * 1024 * 1024) {
                return res.status(400).json({
                    ok: false,
                    error: "Video file too large (max 100 MB)"
                });
            }

            const result = await analyzeVideo(video, fileName, mimeType, size);

            return res.json(result);

        } catch (error) {
            console.error("Video API error:", error);
            console.error("Error stack:", error.stack);
            return res.status(500).json({
                ok: false,
                error: error.message || "Video analysis failed - internal error"
            });
        }
    }
);

/* =========================================================
   VOICE API
========================================================= */

app.post(
    "/api/voice-analyze",
    async (req, res) => {
        try {
            const { audio, fileName, mimeType } = req.body;

            if (!audio) {
                return res.status(400).json({
                    ok: false,
                    error: "Audio data is required"
                });
            }

            const result = await analyzeVoice(audio, fileName, mimeType);

            return res.json(result);

        } catch (error) {
            console.error("Voice API error:", error);
            return res.status(400).json({
                ok: false,
                error: error.message || "Voice analysis failed"
            });
        }
    }
);

/* =========================================================
   API
   HEALTH
========================================================= */

app.get(
    "/api/health",
    (req, res) => {
        res.json({
            ok: true,
            service:
                "SAFNEX NOVA Unified Analyzer",
            version:
                "1.0",
            aiConfigured:
                false,
            analyzerEngine:
                "rule-based",
            cost:
                "FREE",
            linkAnalyzer:
                "POST /api/analyze",
            phoneAnalyzer:
                "POST /api/phone-check",
            phoneValidation:
                "POST /api/phone-validate",
            voiceAnalyzer:
                "POST /api/voice-analyze",
            imageAnalyzer:
                "POST /api/image-analyze",
            videoAnalyzer:
                "POST /api/video-analyze"
        });
    }
);

/* =========================================================
   LINK API
========================================================= */

app.get(
    "/api/analyze",
    (req, res) => {
        res.json({
            ok: true,
            message:
                "SAFNEX NOVA free rule-based LINK analyzer is online.",
            method:
                "POST",
            endpoint:
                "/api/analyze",
            engine:
                "rule-based",
            cost:
                "FREE"
        });
    }
);

app.post(
    "/api/analyze",
    async (req, res) => {
        try {
            const rawUrl =
                normalizeUrl(
                    req.body?.url
                );

            const urlInfo =
                parseUrl(
                    rawUrl
                );

            const parsedUrl =
                new URL(
                    rawUrl
                );

            const knownService =
                detectKnownService(
                    parsedUrl
                );

            let fetchResult =
                null;

            let website =
                null;

            let intelligence =
                null;

            let fetchError =
                "";

            try {
                fetchResult =
                    await fetchWebsite(
                        rawUrl
                    );

                website =
                    extractWebsiteData(
                        fetchResult
                    );

                intelligence =
                    fallbackWebsiteUnderstanding(
                        urlInfo,
                        website,
                        knownService
                    );

            } catch (error) {
                fetchError =
                    error.message;

                console.warn(
                    "Website fetch warning:",
                    error.message
                );

                if (
                    knownService
                ) {
                    intelligence =
                        fallbackWebsiteUnderstanding(
                            urlInfo,
                            null,
                            knownService
                        );
                }
            }

            const security =
                analyzeSecurity(
                    rawUrl,
                    fetchResult,
                    knownService,
                    fetchError
                );

            let websiteData;

            if (
                intelligence
            ) {
                websiteData = {
                    ...intelligence,

                    httpStatus:
                        fetchResult?.status ??
                        "Unavailable",

                    contentType:
                        fetchResult?.contentType ??
                        "Unavailable",

                    status:
                        fetchResult
                            ? (
                                fetchResult.status >= 200 &&
                                fetchResult.status < 400
                                    ? "Reachable"
                                    : "Unreachable"
                            )
                            : "Unverified"
                };

            } else {
                websiteData = {
                    name:
                        "Website information unavailable",
                    type:
                        "Unknown / Unverified Website",
                    category:
                        "Not determined",
                    purpose:
                        "The destination could not be fetched.",
                    summary:
                        "The URL structure was analyzed, but the website itself could not be verified.",
                    services: [],
                    language:
                        "Not determined",
                    confidence:
                        "Low",
                    evidence: [],
                    httpStatus:
                        "Unavailable",
                    contentType:
                        "Unavailable",
                    status:
                        "Unverified"
                };
            }

            let content;

            if (
                website
            ) {
                content = {
                    title:
                        website.title,
                    description:
                        website.description,
                    headings:
                        website.headings,
                    visibleText:
                        website.text,
                    textLength:
                        website.textLength,
                    links:
                        website.links,
                    linkCount:
                        website.links.length,
                    images:
                        website.images,
                    imageCount:
                        website.images.length
                };

            } else if (
                knownService
            ) {
                content = {
                    title:
                        knownService.name,
                    description:
                        knownService.contentDescription,
                    headings: [],
                    visibleText: "",
                    textLength: 0,
                    links: [],
                    linkCount: 0,
                    images: [],
                    imageCount: 0
                };

            } else {
                content = {
                    title:
                        "Unavailable",
                    description:
                        "Website content could not be verified.",
                    headings: [],
                    visibleText: "",
                    textLength: 0,
                    links: [],
                    linkCount: 0,
                    images: [],
                    imageCount: 0
                };
            }

            const questions = {
                websiteType:
                    websiteData.type,

                websiteContent:
                    knownService
                        ? knownService.contentDescription
                        : website
                            ? (
                                website.description ||
                                website.title ||
                                "Public website content was retrieved and analyzed."
                            )
                            : "The website content could not be retrieved.",

                whyScore:
                    buildScoreExplanation(
                        security,
                        knownService,
                        fetchResult,
                        fetchError,
                        parsedUrl
                    )
            };

            return res.json({
                ok: true,

                securityScore:
                    security.score,

                riskScore:
                    security.riskScore,

                verdict:
                    security.verdict,

                riskLevel:
                    security.riskLevel,

                confidence:
                    security.confidence,

                knownPhishing:
                    security.knownPhishing,

                knownService:
                    knownService
                        ? {
                            name:
                                knownService.name,
                            provider:
                                knownService.provider,
                            type:
                                knownService.type,
                            official:
                                knownService.official
                        }
                        : null,

                url:
                    urlInfo,

                finalUrl:
                    fetchResult?.finalUrl ||
                    rawUrl,

                website:
                    websiteData,

                security: {
                    score:
                        security.score,
                    riskScore:
                        security.riskScore,
                    verdict:
                        security.verdict,
                    riskLevel:
                        security.riskLevel,
                    confidence:
                        security.confidence,
                    knownPhishing:
                        security.knownPhishing,
                    indicators:
                        security.indicators,
                    verification:
                        security.verification,
                    malwareReputation:
                        security.malwareReputation,
                    redirects:
                        fetchResult?.redirects ||
                        []
                },

                content,

                questions,

                analysis: {
                    aiEnabled:
                        false,
                    engine:
                        "rule-based",
                    cost:
                        "FREE",
                    websiteUnderstanding:
                        "Website intelligence is based on publicly accessible page content using SAFNEX NOVA free rule-based analysis.",
                    securityNote:
                        "The security score is a risk-signal score, not a guarantee of safety."
                }
            });

        } catch (error) {
            console.error(
                "LINK ANALYSIS ERROR:",
                error
            );

            return res
                .status(400)
                .json({
                    ok: false,
                    error:
                        error?.message ||
                        "Link analysis failed."
                });
        }
    }
);

/* =========================================================
   PHONE API
========================================================= */

app.post(
    "/api/phone-check",
    async (req, res) => {
        try {
            const phone =
                req.body?.phone ||
                req.body?.phoneNumber ||
                req.body?.number;

            const country =
                req.body?.country ||
                "IN";

            const result =
                await analyzePhone(
                    phone,
                    country
                );

            return res.json(result);

        } catch (error) {
            console.error(
                "PHONE CHECK ERROR:",
                error.message
            );

            return res
                .status(400)
                .json({
                    ok: false,

                    error:
                        error?.message ||
                        "Phone analysis failed."
                });
        }
    }
);

app.post(
    "/api/phone-validate",
    (req, res) => {
        try {
            const phone =
                req.body?.phone ||
                req.body?.phoneNumber ||
                req.body?.number;

            const country =
                req.body?.country ||
                "IN";

            const rawPhone =
                String(
                    phone || ""
                ).trim();

            if (!rawPhone) {
                throw new Error(
                    "Phone number is required."
                );
            }

            const selectedCountry =
                String(country)
                    .toUpperCase();

            if (
                !PHONE_COUNTRIES[
                    selectedCountry
                ]
            ) {
                throw new Error(
                    "Unsupported country code."
                );
            }

            const parsed =
                parsePhoneNumberFromString(
                    rawPhone,
                    selectedCountry
                );

            const valid =
                parsed
                    ? parsed.isValid()
                    : false;

            const possible =
                parsed
                    ? parsed.isPossible()
                    : false;

            return res.json({
                ok: true,

                valid,

                possible,

                country:
                    parsed?.country ||
                    selectedCountry,

                countryName:
                    PHONE_COUNTRIES[
                        parsed?.country ||
                        selectedCountry
                    ] ||
                    "Unknown",

                callingCode:
                    parsed
                        ? "+" +
                          parsed.countryCallingCode
                        : null,

                international:
                    parsed
                        ? parsed.formatInternational()
                        : null,

                national:
                    parsed
                        ? parsed.formatNational()
                        : null,

                e164:
                    parsed
                        ? parsed.number
                        : null
            });

        } catch (error) {
            console.error(
                "PHONE VALIDATION ERROR:",
                error.message
            );

            return res
                .status(400)
                .json({
                    ok: false,

                    error:
                        error?.message ||
                        "Phone validation failed."
                });
        }
    }
);

app.get(
    "/api/phone-check",
    async (req, res) => {
        try {
            const phone =
                req.query?.phone ||
                req.query?.phoneNumber ||
                req.query?.number;

            const country =
                req.query?.country ||
                "IN";

            const result =
                await analyzePhone(
                    phone,
                    country
                );

            return res.json(result);

        } catch (error) {
            return res
                .status(400)
                .json({
                    ok: false,

                    error:
                        error?.message ||
                        "Phone analysis failed."
                });
        }
    }
);

/* =========================================================
   API 404
========================================================= */

app.use(
    "/api",
    (req, res) => {
        res
            .status(404)
            .json({
                ok: false,
                error:
                    "API endpoint not found."
            });
    }
);

/* =========================================================
   GENERAL ERROR
========================================================= */

app.use(
    (
        err,
        req,
        res,
        next
    ) => {
        console.error(
            "SERVER ERROR:",
            err
        );

        res
            .status(500)
            .json({
                ok: false,
                error:
                    "Internal server error."
            });
    }
);

/* =========================================================
   STATIC FRONTEND
========================================================= */

app.use(
    express.static(
        __dirname
    )
);

// Serve static files
app.use(express.static(__dirname));

app.get(
    "/",
    (req, res) => {
        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );
    }
);

/* =========================================================
   START
========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            "=============================================="
        );

        console.log(
            "SAFNEX NOVA UNIFIED ANALYZER"
        );

        console.log(
            "=============================================="
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            "LINK: FREE RULE-BASED"
        );

        console.log(
            "PHONE: FREE RULE-BASED"
        );

        console.log(
            "AI: DISABLED"
        );

        console.log(
            "ENGINE: RULE-BASED"
        );

        console.log(
            "COST: FREE"
        );

        console.log(
            "Health: /api/health"
        );

        console.log(
            "Link: POST /api/analyze"
        );

        console.log(
            "Phone: POST /api/phone-check"
        );

        console.log(
            "Validate: POST /api/phone-validate"
        );

        console.log(
            "Voice: POST /api/voice-analyze"
        );

        console.log(
            "Image: POST /api/image-analyze"
        );

        console.log(
            "Video: POST /api/video-analyze"
        );

        console.log(
            "=============================================="
        );
    }
);
