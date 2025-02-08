const localstream = document.getElementById('localstream');
const remotestream = document.getElementById('remotestream');
const mutebtn = document.getElementById('mutebtn');
const hidebtn = document.getElementById('hidebtn');
const endbtn = document.getElementById('endbtn');

const socket = io('https://miniapp-videocall-server.onrender.com');

const peerConnection = new RTCPeerConnection({
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "38ee091c80ce59e7934dc880",
            credential: "DCdxPjEpZcziiiKk",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "38ee091c80ce59e7934dc880",
            credential: "DCdxPjEpZcziiiKk",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "38ee091c80ce59e7934dc880",
            credential: "DCdxPjEpZcziiiKk",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "38ee091c80ce59e7934dc880",
            credential: "DCdxPjEpZcziiiKk",
        },
    ],
});

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
    stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
    });
    localstream.srcObject = stream;
}).catch((error) => {
    console.error('Error accessing media devices:', error);
    alert('Could not access media devices. Please ensure permissions are granted.');
});

localstream.onplaying = function () {
    const loader = localstream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = 'none';
    }
};

socket.on('offer', async (offer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async (answer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("Connected successfully");
    } catch (error) {
        console.error('Error handling answer:', error);
    }
});

peerConnection.ontrack = async (event) => {
    try {
        remotestream.srcObject = event.streams[0];
        remotestream.onplaying = function () {
            const loader = remotestream.nextElementSibling;
            if (loader && loader.classList.contains('loader')) {
                loader.style.display = 'none';
            }
        };
    } catch (error) {
        console.error('Error handling track event:', error);
    }
};

peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
        try {
            socket.emit('ice', event.candidate);
        } catch (error) {
            console.error('Error sending ICE candidate:', error);
        }
    }
};

socket.on('ice', async (ice) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

async function sendOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
    } catch (error) {
        console.error('Error sending offer:', error);
    }
}

peerConnection.onnegotiationneeded = sendOffer;


endbtn.addEventListener('click', () => {
    peerConnection.close();  
    localstream.srcObject.getTracks().forEach(track => track.stop());  
    alert('Call ended.');
    window.close()
});


let isMuted = false;
mutebtn.addEventListener('click', () => {
    isMuted = !isMuted;
    localstream.srcObject.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;  
    });
    mutebtn.textContent = isMuted ? 'Unmute' : 'Mute';  
});


let isHidden = false;
hidebtn.addEventListener('click', () => {
    isHidden = !isHidden;
    localstream.srcObject.getVideoTracks().forEach(track => {
        track.enabled = !isHidden;  
    });
    hidebtn.textContent = isHidden ? 'Show Video' : 'Hide Video';  
});

peerConnection.oniceconnectionstatechange = () => {
    switch (peerConnection.iceConnectionState) {
        case 'failed':
        case 'disconnected':
        case 'closed':
            console.error('Peer connection failed or disconnected.');
            break;
        case 'connected':
            console.log('Peer connection established.');
            break;
        default:
            break;
    }
};

peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === 'failed') {
        console.error('Connection failed.');
    }
};
