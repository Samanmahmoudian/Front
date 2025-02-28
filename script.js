/** @type {HTMLVideoElement} */
const localstream = document.getElementById('localstream');
/** @type {HTMLVideoElement} */
const remotestream = document.getElementById('remotestream');
const muteBtn = document.getElementById('mutebtn');
const switchBtn = document.getElementById('switchbtn');
const nextBtn = document.getElementById('nextbtn');
const startBtn = document.getElementById('startbtn');
let playBtn = document.getElementById("playbutton");

localstream.onplaying = function () {
    const loader = localstream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = 'none';
    }
};

remotestream.onplaying = function () {
    const loader = remotestream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = 'none';
    }
};

alert(window.Telegram.WebApp.initDataUnsafe.user)
const socket = io('https://miniapp-videocall-server.onrender.com');

const peerConnectionConfig = {
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

let myId;
let partnerId;

/**@type {MediaStream} */
let stream;

let isMuted = false;
let isHidden = false;

let camera_view = 'user';

/** @type {RTCPeerConnection} */
let peerConnection;
let remoteFacingMode = 'user';

async function shareMedia() {
    try {
        if (stream) {
            localstream.pause();
            stream.getTracks().forEach(track => track.stop());
            localstream.srcObject = null;
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: camera_view }, audio: true });
        localstream.srcObject = stream;
        localstream.play();
        console.log('Media shared successfully');
    } catch (error) {
        console.error('Can not share media:', error);
        alert('Can not share media: ' + error.message);
    }
}

socket.on('my_id', (id) => {
    myId = id;
    console.log("My ID:", myId);
});

socket.on('offer_state', async (offer) => {
    if (!peerConnection || peerConnection.signalingState === 'closed') {
        peerConnection = new RTCPeerConnection(peerConnectionConfig);
    }
    if (offer.state == 'ready') {
        partnerId = await offer.partnerId;
        console.log('Your partner id is: ' + offer.partnerId);
        await startOffer();
    } else if (offer.state == 'connected') {
        partnerId = await offer.partnerId;
        console.log('Your partner id is: ' + offer.partnerId);
    }
});

async function startOffer() {
    if (!stream) {
        await shareMedia();
    }
    stream.getTracks().forEach(async (track) => {
        await peerConnection.addTrack(track, stream);
        console.log('track added');
    });

    peerConnection.ontrack = async (event) => {
        if (remotestream.played) {
            remotestream.pause();
        }
        console.log(event.streams[0]);
        await new Promise(async (resolve) => {
            remotestream.srcObject = await event.streams[0];
            if (!remotestream.played){
                await remotestream.play();
            }
            resolve();
        });
    };

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            try {
                socket.emit('ice', { ice: event.candidate, to: partnerId });
            } catch (error) {
                console.error('Error sending ICE candidate:', error);
            }
        }
    };
    const offer = await peerConnection.createOffer({ iceRestart: true });
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { offer: offer, to: partnerId });
}

let iceCandidateQueue = [];

socket.on('ice', async (ice) => {
    try {
        if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
        } else {
            iceCandidateQueue.push(ice);
        }
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

socket.on('offer', async (offer) => {
    try {
        if (!peerConnection || peerConnection.signalingState === 'closed') {
            peerConnection = new RTCPeerConnection(peerConnectionConfig);
        }
        if (!stream) {
            await shareMedia();
        }
        stream.getTracks().forEach(async (track) => {
            await peerConnection.addTrack(track, stream);
            console.log('track added');
        });
        peerConnection.ontrack = async (event) => {
            if (remotestream.played) {
                await remotestream.pause();
            }
            console.log(event.streams[0]);
            await new Promise(async (resolve) => {
                remotestream.srcObject = await event.streams[0];
                if(!remotestream.played){
                    await remotestream.play();
                }
                resolve();
            });
        };

        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                try {
                    socket.emit('ice', { ice: event.candidate, to: partnerId });
                } catch (error) {
                    console.error('Error sending ICE candidate:', error);
                }
            }
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', { answer: answer, to: partnerId });

        while (iceCandidateQueue.length) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
        }
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async (answer) => {
    try {
        if (!peerConnection || peerConnection.signalingState === 'closed') {
            peerConnection = new RTCPeerConnection(peerConnectionConfig);
        }
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

        while (iceCandidateQueue.length) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
        }
    } catch (error) {
        console.error('Error handling answer:', error);
    }
});

socket.on('disconnected', async (messege) => {
    if (partnerId == messege) {
        await endpeer();
    }
});

async function endpeer() {
    if (peerConnection) {
         peerConnection.close();
    }
    peerConnection.getReceivers().forEach(reciever => {
        if(reciever.track){
            reciever.track.stop();
        }
        
    }
    )
    remotestream.srcObject =  null;
    const loader = remotestream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = '';
    }
    socket.emit('startnewcall');
    partnerId = '';
}

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
    muteBtn.querySelector('img').src = isMuted ? './Icons/Mic off Btn.svg' : './Icons/Mic on Btn.svg';
});

switchBtn.addEventListener('click', async () => {
    camera_view = await camera_view === 'user' ? 'environment' : 'user';
    if (peerConnection) {
        try {
            await shareMedia();
            const senders = peerConnection.getSenders();
            senders.forEach(sender => {
                if (sender.track.kind === "video") {
                    sender.replaceTrack(stream.getVideoTracks()[0]);
                    console.log(stream.getVideoTracks()[0]);
                }
                if (sender.track.kind === "audio") {
                    sender.replaceTrack(stream.getAudioTracks()[0]);
                }
            });
        } catch (error) {
            alert('Failed to switch camera:', error);
            switchBtn.click();
        }

    } else {
        await shareMedia();
    }

});

nextBtn.addEventListener('click', async () => {
    if(peerConnection) {
         peerConnection.close();
    }


    await socket.emit('nextcall', partnerId);
    partnerId = '';
    socket.emit('startnewcall');
    remotestream.srcObject = null;
    const loader = remotestream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = '';
    }

});

socket.on('nextcall', async (nextcall) => {
    await endpeer();
});

async function setAudioOutputToSpeaker() {
    if (typeof remotestream.sinkId !== 'undefined') {
        try {
            await remotestream.setSinkId('default');
            console.log('Audio output set to speaker');
        } catch (error) {
            console.error('Error setting audio output to speaker:', error);
        }
    } else {
        console.warn('Browser does not support output device selection.');
    }
}
setAudioOutputToSpeaker();

startBtn.addEventListener('click', async () => {
    startBtn.style.display = 'none';
    nextBtn.style.display = 'block';
    muteBtn.style.display = 'block';
    switchBtn.style.display = 'block';
    await shareMedia();
    socket.emit('readytostart');
});
