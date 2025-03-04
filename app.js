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

async function createOffer() {
    if (!stream) await shareMedia();
    
    stream.getTracks().forEach(track=>{
        peerConnection.addTrack(track , stream)
    })

    peerConnection.ontrack = async (event) => {
        return new Promise(async(resolve)=>{
            if(event.streams[0]){
                await console.log(event.streams[0])
                await console.log(remotestream.srcObject)
                remotestream.srcObject = await event.streams[0]
                await console.log(remotestream.srcObject)
                remotestream.onloadedmetadata = ()=>{
                    console.log('load done')
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

socket.on('offer', async (offer) => {
    if (!stream) await shareMedia();

    stream.getTracks().forEach(track=>{
        peerConnection.addTrack(track , stream)
    })

    peerConnection.ontrack = async (event) => {
        return new Promise(async(resolve)=>{
            if(event.streams[0]){
                await console.log(event.streams[0])
                await console.log(remotestream.srcObject)
                remotestream.srcObject = await event.streams[0]
                await console.log(remotestream.srcObject)
                remotestream.onloadedmetadata = ()=>{
                    console.log('load done')
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


