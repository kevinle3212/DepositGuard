import sgMail from "@sendgrid/mail";
import { sendEmail } from "../lib/sendgrid.js";

jest.mock("@sendgrid/mail", () => ({
    __esModule: true,
    default: {
        setApiKey: jest.fn(),
        send: jest.fn(),
    },
}));

const mockedSend = sgMail.send as jest.MockedFunction<typeof sgMail.send>;

describe("sendEmail", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SENDGRID_API_KEY = "SG.test";
        process.env.SENDGRID_FROM_EMAIL = "noreply@nestcrow.tech";
    });

    test("sends via SendGrid and returns x-message-id header", async () => {
        mockedSend.mockResolvedValue([{ headers: { "x-message-id": "sg-msg-1" } }] as never);

        const mailId = await sendEmail(["a@example.com"], {
            subject: "Test",
            text: "Hello",
            html: "<p>Hello</p>",
        });

        expect(sgMail.setApiKey).toHaveBeenCalledWith("SG.test");
        expect(mockedSend).toHaveBeenCalledWith({
            to: ["a@example.com"],
            from: "noreply@nestcrow.tech",
            subject: "Test",
            text: "Hello",
            html: "<p>Hello</p>",
        });
        expect(mailId).toBe("sg-msg-1");
    });

    test("throws when SENDGRID_API_KEY is missing", async () => {
        delete process.env.SENDGRID_API_KEY;

        await expect(
            sendEmail(["a@example.com"], { subject: "T", text: "t", html: "<p>t</p>" }),
        ).rejects.toThrow("SENDGRID_API_KEY not set");
    });
});
