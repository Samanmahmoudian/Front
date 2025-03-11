const peerConnectionConfig = {
    iceServers: [

                {
                  urls: "stun:stun.relay.metered.ca:80",
                },
                {
                  urls: "turn:global.relay.metered.ca:80",
                  username: "0b7405b3ccaf2b0fdf498c68",
                  credential: "MjD96GEWGC5oBWSJ",
                },
                {
                  urls: "turn:global.relay.metered.ca:80?transport=tcp",
                  username: "0b7405b3ccaf2b0fdf498c68",
                  credential: "MjD96GEWGC5oBWSJ",
                },
                {
                  urls: "turn:global.relay.metered.ca:443",
                  username: "0b7405b3ccaf2b0fdf498c68",
                  credential: "MjD96GEWGC5oBWSJ",
                },
                {
                  urls: "turns:global.relay.metered.ca:443?transport=tcp",
                  username: "0b7405b3ccaf2b0fdf498c68",
                  credential: "MjD96GEWGC5oBWSJ",
                },
                {
                    urls: "stun:stun.relay.metered.ca:80",
                  },
                  {
                    urls: "turn:global.relay.metered.ca:80",
                    username: "49a1c3a66c9064a2e7f59e42",
                    credential: "0Rz62ookfKDjOdqz",
                  },
                  {
                    urls: "turn:global.relay.metered.ca:80?transport=tcp",
                    username: "49a1c3a66c9064a2e7f59e42",
                    credential: "0Rz62ookfKDjOdqz",
                  },
                  {
                    urls: "turn:global.relay.metered.ca:443",
                    username: "49a1c3a66c9064a2e7f59e42",
                    credential: "0Rz62ookfKDjOdqz",
                  },
                  {
                    urls: "turns:global.relay.metered.ca:443?transport=tcp",
                    username: "49a1c3a66c9064a2e7f59e42",
                    credential: "0Rz62ookfKDjOdqz",
                  },
                
            
          
    ],
};

// String(Math.floor(Math.random() * 1000) + 1)
const myTelegramId = getTelegramId()
let myId; 
let partnerId;
let stream;
let isMuted = false;
let camera_view = 'user';
let remoteCameraView = null;
/**@type {RTCPeerConnection} */
let peerConnection;
let iceCandidateQueue = [];
let lockNextCall = false
/**@type {HTMLVideoElement} */
const localstream = document.getElementById('localstream');
/**@type {HTMLVideoElement} */
const remotestream = document.getElementById('remotestream');
const muteBtn = document.getElementById('mutebtn');
const switchBtn = document.getElementById('switchbtn');
const nextBtn = document.getElementById('nextbtn');
const startBtn = document.getElementById('startbtn');
let playBtn = document.getElementById("playbutton");


 
function getTelegramId(){
    window.Telegram.WebApp.ready();
    if(window.Telegram.WebApp.initDataUnsafe){
        return String(window.Telegram.WebApp.initDataUnsafe.user.id)
    }else{
        alert('Please enter with Telegram...!')
        window.close()
    }
}




localstream.onplaying = function () {
    if(camera_view == 'environment'){
        localstream.style.transform = 'scaleX(-1)'
    }else if(camera_view == 'user'){
        localstream.style.transform == 'scaleX(1)'
    }
    const loader = localstream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = 'none';
    }
};

remotestream.onplaying = function () {
    if(remoteCameraView == 'environment'){
        remotestream.style.transform = 'scaleX(-1)'
    }else if(remoteCameraView == 'user'){
        remotestream.style.transform == 'scaleX(1)'
    }
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
    if(partnerId) socket.emit('cameraview' , {data: camera_view , to:partnerId})
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

const socket = io(`http://localhost:3000`, { query: { userTelegramId: myTelegramId } });

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
    if(!lockNextCall){
        lockNextCall = true
        if (peerConnection) {
            await peerConnection.close();
            
        }
        remotestream.srcObject = null;
        let getReceivers = peerConnection.getReceivers()
        if(getReceivers){
            getReceivers.forEach(reciever => {
                if (reciever.track) {
                    reciever.track.stop();
                }
            });
        }

        socket.emit('startNewCall', myTelegramId);
        const loader = remotestream.nextElementSibling;
        if (loader && loader.classList.contains('loader')) {
            loader.style.display = '';
        }
        partnerId = '';
        
        setTimeout(()=>{
            lockNextCall = false

        },1000)
    }

    
}

async function createOffer() {
    if (!stream) await shareMedia();

    const senders = await peerConnection.getSenders();
    senders.forEach(track => {
        peerConnection.removeTrack(track);
    });
    socket.emit('cameraview' , {data: camera_view , to:partnerId})
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = async(event) => {
        
            if(!remotestream.paused){
                remotestream.pause
            }
            if(!event.streams[0]) console.log('injas moshkel')
                console.log(event.streams[0])
                remotestream.srcObject = await event.streams[0]
                remotestream.oncanplay = async()=>{
                    await remotestream.play()
                }
            
        }

    

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice', { to: partnerId, data: event.candidate });
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice', { to: partnerId, data: event.candidate });
        }
    };
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected') {
            const receivers = peerConnection.getReceivers();

            receivers.forEach(receiver => {
                console.log('Receiver track kind:', receiver.track.kind);
                console.log('Receiver track id:', receiver.track);
        })
    }    else if(peerConnection.iceConnectionState == "disconnected"){
        socket.emit('nextcall', {from:myTelegramId , to:partnerId});
        if(!lockNextCall) endpeer()
        
    }
}
    

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer).then(()=>{
        console.log('offer')
    });
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
    await socket.emit('nextcall', {from:myTelegramId , to:partnerId});
    await endpeer()

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
    setTimeout(()=>{
        endpeer()
    },500)
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
    socket.emit('cameraview' , {data: camera_view , to:partnerId})
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = async(event) => {
        
            if(!remotestream.paused){
                remotestream.pause
            }
            if(!event.streams[0]) console.log('injas moshkel')
                console.log(event.streams[0])
                remotestream.srcObject = await event.streams[0]
                remotestream.oncanplay = async()=>{
                    await remotestream.play()
                }

        }
    

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice', { to: partnerId, data: event.candidate });
        }
    };
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected') {
            const receivers = peerConnection.getReceivers();

            receivers.forEach(receiver => {
                console.log('Receiver track kind:', receiver.track.kind);
                console.log('Receiver track id:', receiver.track);
        })
    }
    else if(peerConnection.iceConnectionState == "disconnected"){
        socket.emit('nextcall', {from:myTelegramId , to:partnerId});;
        endpeer()
    }
}
    


    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer).then(()=>{
        console.log('answer local description')
    });
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


socket.on('cameraview' , async(cameraview)=>{
    remoteCameraView = camera_view
    alert(remoteCameraView)
})
