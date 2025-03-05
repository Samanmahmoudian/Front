const peerConnectionConfig = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "3d4c3bafb3a7da4b33bd3f07",
            credential: "Ib6+qiOHo648ZsE5",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "3d4c3bafb3a7da4b33bd3f07",
            credential: "Ib6+qiOHo648ZsE5",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "3d4c3bafb3a7da4b33bd3f07",
            credential: "Ib6+qiOHo648ZsE5",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "3d4c3bafb3a7da4b33bd3f07",
            credential: "Ib6+qiOHo648ZsE5",
        },
    ],
};

const myTelegramId = String(Math.floor(Math.random() * 1000) + 1);
let myId; 
let partnerId;
let stream;
let isMuted = false;
let camera_view = 'user';
/**@type {RTCPeerConnection} */
let peerConnection;
let iceCandidateQueue = [];
/**@type {HTMLVideoElement} */
const localstream = document.getElementById('localstream');
/**@type {HTMLVideoElement} */
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

async function shareMedia() {
    if (stream) {
        if (!localstream.paused) {
            localstream.pause();
        }
        stream.getTracks().forEach(track => track.stop());
        localstream.srcObject = null;
    }
    stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: camera_view },
        audio: true
    });
    localstream.srcObject = stream;

    // Manually play the local stream for WebView compatibility
    if (localstream.paused || localstream.ended) {
        await localstream.play().catch(err => {
            console.log('Error playing local stream:', err);
        });
    }
}

const socket = io(`https://miniapp-videocall-server.onrender.com`, { query: { userTelegramId: myTelegramId } });

startBtn.addEventListener('click', async () => {
    startBtn.style.display = 'none';
    nextBtn.style.display = 'block';
    muteBtn.style.display = 'block';
    switchBtn.style.display = 'block';
    await shareMedia();
    await socket.emit('startNewCall', myTelegramId);
    remotestream.play()
});

async function endpeer() {
    if (peerConnection) {
        await peerConnection.close();
    }
    iceCandidateQueue = []
    remotestream.srcObject = null;
    peerConnection.getReceivers().forEach(reciever => {
        if (reciever.track) {
            reciever.track.stop();
        }
    });
    socket.emit('startNewCall', myTelegramId);
    const loader = remotestream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = '';
    }
    partnerId = '';
}

async function createOffer() {
    if (!stream) await shareMedia();

    const senders = await peerConnection.getSenders();
    senders.forEach(track => {
        peerConnection.removeTrack(track);
    });

    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = async(event) => {
        try{
            if(!event.streams[0]) console.log('injas moshkel')
                console.log(event.streams[0])
                remotestream.srcObject = await event.streams[0]
                remotestream.oncanplay = async()=>{
                    await remotestream.play()
                }
            }catch{
                console.log('meow')
            }
        }

    

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && peerConnection.remoteDescription) {
            socket.emit('ice', { to: partnerId, data: event.candidate });
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && peerConnection.remoteDescription) {
            socket.emit('ice', { to: partnerId, data: event.candidate });
        }
    };
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected') {
            const receivers = peerConnection.getReceivers();

            receivers.forEach(receiver => {
                console.log('Receiver track kind:', receiver.track.kind);
                console.log('Receiver track id:', receiver.track.id);
        })
    };
}
    

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { to: partnerId, data: offer });

    while (iceCandidateQueue.length && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
    }
}

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
    muteBtn.querySelector('img').src = isMuted ? './Icons/Mic off Btn.svg' : './Icons/Mic on Btn.svg';
});

switchBtn.addEventListener('click', async () => {
    camera_view = camera_view === 'user' ? 'environment' : 'user';
    if (peerConnection) {
        try {
            await shareMedia();
            const senders = peerConnection.getSenders();
            senders.forEach(sender => {
                if (sender.track.kind === "video") {
                    sender.replaceTrack(stream.getVideoTracks()[0]);
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
    await socket.emit('nextcall', partnerId);
    await endpeer();
});

socket.on('caller', async (partnerTelegramId) => {
    if (peerConnection) {
        peerConnection.close();
    }
    partnerId = partnerTelegramId;
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    await createOffer();
});

socket.on('callee', async (partnerTelegramId) => {
    if (peerConnection) {
        peerConnection.close();
    }
    partnerId = partnerTelegramId;
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
});

socket.on('nextcall', async () => {
    await endpeer();
});

socket.on('disconnected', async (message) => {
    if (partnerId === message) {
        await endpeer();
    }
});

socket.on('offer', async (offer) => {
    if (!stream) await shareMedia();

    const senders = await peerConnection.getSenders();
    senders.forEach(track => {
        peerConnection.removeTrack(track);
    });

    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = async(event) => {
        try{
            if(!event.streams[0]) console.log('injas moshkel')
                console.log(event.streams[0])
                remotestream.srcObject = await event.streams[0]
                remotestream.oncanplay = async()=>{
                    await remotestream.play()
                }
            }catch{
                console.log('meow')
            }
        }
    

    peerConnection.onicecandidate = (event) => {
        if (event.candidate && peerConnection.remoteDescription) {
            socket.emit('ice', { to: partnerId, data: event.candidate });
        }
    };
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected') {
            const receivers = peerConnection.getReceivers();

            receivers.forEach(receiver => {
                console.log('Receiver track kind:', receiver.track.kind);
                console.log('Receiver track id:', receiver.track.id);
        })
    };
}
    


    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { to: partnerId, data: answer });

    while (iceCandidateQueue.length) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
    }
});

socket.on('answer', async (answer) => {
    if (peerConnection.signalingState === 'have-local-offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        while (iceCandidateQueue.length) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
        }
    }
});

socket.on('ice', async (ice) => {
    if (peerConnection.remoteDescription) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
            console.log('ICE candidate added');
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    } else {
        console.warn('Storing ICE candidate because remote description is not set yet.');
        iceCandidateQueue.push(ice);
    }
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
