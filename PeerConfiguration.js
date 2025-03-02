export const peerConnectionConfig = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "a4f5d501c33dfea6e2836653",
            credential: "sxmhLRRVlHNc7aUL",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "a4f5d501c33dfea6e2836653",
            credential: "sxmhLRRVlHNc7aUL",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "a4f5d501c33dfea6e2836653",
            credential: "sxmhLRRVlHNc7aUL",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "a4f5d501c33dfea6e2836653",
            credential: "sxmhLRRVlHNc7aUL",
        },
        { urls: "stun:stun.l.google.com:19302" },
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "bff881b65e7cda72364ea616",
            credential: "r93lIGVmjDZcQD5Y",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "bff881b65e7cda72364ea616",
            credential: "r93lIGVmjDZcQD5Y",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "bff881b65e7cda72364ea616",
            credential: "r93lIGVmjDZcQD5Y",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "bff881b65e7cda72364ea616",
            credential: "r93lIGVmjDZcQD5Y",
        },
    ],
};