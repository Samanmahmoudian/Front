/** @type {HTMLVideoElement} */
const localstream = document.getElementById('localstream');
/** @type {HTMLVideoElement} */
const remotestream = document.getElementById('remotestream');
const muteBtn = document.getElementById('mutebtn');
const hideBtn = document.getElementById('hidebtn');
const switchBtn = document.getElementById('switchbtn');
const nextBtn = document.getElementById('nextbtn');
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

let remoteFacingMode = 'user'
async function shareMedia() {
    try {
        localstream.onplaying = async()=>{
            await stream.getTracks().forEach(track => track.stop());
            localstream.srcObject = await null
        }
        
        stream = navigator.mediaDevices.getUserMedia({ video: { facingMode: camera_view }, audio: true })
        localstream.srcObject = await stream;
        localstream.play()
    

        }catch(error) {
        alert('can not share media: ', error);
    }
}
shareMedia();

socket.on('my_id', (id) => {
    myId = id;
    console.log("My ID:", myId);
});

socket.on('offer_state', async (offer) => {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
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
    socket.emit('facingmode', { facingmode: camera_view, to: partnerId });
    stream.getTracks().forEach(async (track) => {
        await peerConnection.addTrack(track, stream);
        console.log('track added');
    });
    
    peerConnection.ontrack = async (event) => {
        if (remotestream) {
            remotestream.pause();
        }
        console.log(event.streams[0]);
        await new Promise(async (resolve ) => {
            remotestream.srcObject = await event.streams[0];
            resolve()
        }).then(() => {
            playBtn.style.display = 'block';
        }).catch(err=>{
            alert(err)
        })
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
        if (!stream) {
            await shareMedia();
        }
        socket.emit('facingmode', { facingmode: camera_view, to: partnerId });
        stream.getTracks().forEach(async (track) => {
            await peerConnection.addTrack(track, stream);
            console.log('track added');
        });
        peerConnection.ontrack = async (event) => {
            if (remotestream) {
                remotestream.pause();
            }
            console.log(event.streams[0]);
            await new Promise(async (resolve ) => {
                remotestream.srcObject = await event.streams[0];
                resolve()
            }).then(() => {
                playBtn.style.display = 'block';
            }).catch(err=>{
                alert(err)
            })
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
        playBtn.style.display = 'none'
        await endpeer();
    }
});

async function endpeer() {
    if (peerConnection) {
        await peerConnection.close();
        
    }
    remotestream.srcObject = null;
    playBtn.style.display = await 'none'
    const loader = remotestream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = '';
    }
    socket.emit('startnewcall', 'done');
    partnerId = '';
}

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
    muteBtn.querySelector('img').src = isMuted ? './Icons/Mic off Btn.svg' : './Icons/Mic on Btn.svg';
});

hideBtn.addEventListener('click', () => {
    isHidden = !isHidden;
    stream.getVideoTracks().forEach(track => track.enabled = !isHidden);
    hideBtn.querySelector('img').src = isHidden ? './Icons/Video off Btn.svg' : './Icons/Video on Btn.svg';
});

switchBtn.addEventListener('click', async () => {
    camera_view = await camera_view === 'user' ? 'environment' : 'user';
    socket.emit('facingmode', { facingmode: camera_view, to: partnerId });
    if(peerConnection){
        try{
            await shareMedia()
            
            const senders = peerConnection.getSenders();
            senders.forEach(sender => {
                if (sender.track.kind === "video") {
                    sender.replaceTrack(stream.getVideoTracks()[0]);
                    console.log(stream.getVideoTracks()[0])
                }
                if (sender.track.kind === "audio") {
                    sender.replaceTrack(stream.getAudioTracks()[0]);
                }
            });    
        }catch(error){
            alert('Failed to switch camera:', error);
            switchBtn.click()
        }

    }else{
        await shareMedia()
    }

        

    

    
});

nextBtn.addEventListener('click', async () => {
    if (peerConnection) {
        await peerConnection.close();
        playBtn.style.display = 'none';
    }
    await socket.emit('nextcall', partnerId);
    remotestream.srcObject = null;
    const loader = remotestream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = '';
    }
    partnerId = '';
    socket.emit('startnewcall', 'ended');
});

socket.on('nextcall', async (nextcall) => {
    if (nextcall) {
        await endpeer();
    }
});

playBtn.addEventListener("click", () => {
    if (remotestream) {
        remotestream.play();
        playBtn.style.display = 'none';
    }else{
        playBtn.style.display = 'none';
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

socket.on('facingmode', async (facingmode) => {
    alert(facingmode)
});