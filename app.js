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
  }

  
const myTelegramId = String(Math.floor(Math.random() * 1000) + 1);
alert(myTelegramId)
let myId; 
let partnerId;
/**@type {MediaStream} */
let stream;
let isMuted = false;
let isHidden = false;
let camera_view = 'user';
/** @type {RTCPeerConnection} */
let peerConnection 
let iceCandidateQueue = [];
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




//  function getTelegramId(){
//     window.Telegram.WebApp.ready()
//     if (window.Telegram.WebApp.initDataUnsafe) {
//         alert(window.Telegram.WebApp.initDataUnsafe.user.id)    
//         return String(window.Telegram.WebApp.initDataUnsafe.user.id);
//     } else {
//         window.close()
//     }
// }

async function shareMedia(){
    if(stream){
        if(!localstream.paused){
            localstream.pause()
        }
        stream.getTracks().forEach(track => track.stop());
        localstream.srcObject = null
    }
    stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: camera_view},
        audio: true
    });
    localstream.srcObject = await stream
    if(localstream.paused || localstream.ended){
        await localstream.play().then(()=>{
            console.log('camera turned on')
        })
    }
    
    
}


const socket = io(`https://miniapp-videocall-server.onrender.com` , {query: {userTelegramId: myTelegramId}});

startBtn.addEventListener('click', async () => {
    startBtn.style.display = 'none';
    nextBtn.style.display = 'block';
    muteBtn.style.display = 'block';
    switchBtn.style.display = 'block';
    await shareMedia();
    await socket.emit('startNewCall' , myTelegramId);
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
    await socket.emit('startNewCall' , myTelegramId);
    partnerId = '';
}

async function createOffer() {
    if (!stream) await shareMedia();
    
    stream.getTracks().forEach(track=>{
        peerConnection.addTrack(track , stream)
    })

    peerConnection.ontrack = async (event) => {
        if(!remotestream.paused){
            remotestream.pause()
        }
        return new Promise(async(resolve)=>{
            if(event.streams[0]){
                remotestream.srcObject = await event.streams[0]
                remotestream.onloadedmetadata = ()=>{
                    remotestream.play().then(()=>{
                        console.log('remote stream is playing')
                    }).catch(err=>{
                        console.log(err)
                    })
                }
            }
        })
    };
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && partnerId) {
            socket.emit('ice' , {to: partnerId , data: event.candidate});
        }
    };
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer).then(()=>{
        console.log('offer created')
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
    await socket.emit('startNewCall' , myTelegramId);
    remotestream.srcObject = null;
    const loader = remotestream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = '';
    }

});

socket.on('caller' , async(partnerTelegramId)=>{
    console.log('caller')
    partnerId = await partnerTelegramId
    peerConnection =await new RTCPeerConnection(peerConnectionConfig)
    createOffer()
})

socket.on('callee' , async(partnerTelegramId)=>{
    console.log('callee')
    partnerId = await partnerTelegramId
    peerConnection = await new RTCPeerConnection(peerConnectionConfig)
})

socket.on('nextcall', async (nextcall) => {
    await endpeer();
});

socket.on('disconnected', async (messege) => {
    if (partnerId == messege) {
        await endpeer();
    }
});

socket.on('offer', async (offer) => {
    if (!stream) await shareMedia();

    stream.getTracks().forEach(track=>{
        peerConnection.addTrack(track , stream)
    })

    peerConnection.ontrack = async (event) => {
        if(!remotestream.paused){
            remotestream.pause()
        }
        return new Promise(async(resolve)=>{
            if(event.streams[0]){
                remotestream.srcObject = await event.streams[0]
                remotestream.onloadedmetadata = ()=>{
                    remotestream.play().then(()=>{
                        console.log('remote stream is playing')
                    }).catch(err=>{
                        console.log(err)
                    })
                }
            }
        })
    };
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && partnerId) {
            socket.emit('ice' , {to: partnerId , data: event.candidate});
        }
    };
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer)).then(()=>{
        console.log('Remote description set for callee');
    });


    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { to: partnerId, data: answer });

    while (iceCandidateQueue.length) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
    }
});


socket.on('answer' , async(answer)=>{
    if (peerConnection.signalingState === 'have-local-offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer)).then(()=>{
            console.log('answer done')
        });
        while (iceCandidateQueue.length) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
        }
    }
})

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

