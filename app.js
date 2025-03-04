
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
let peerConnection;
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
        await localstream.play()
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

async function createOffer(){
    peerConnection = await new RTCPeerConnection(peerConnectionConfig);
    if(!stream){
        await shareMedia()
    }
    stream.getTracks().forEach(async(track) => {
       await peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = async (event) => {
        return new Promise(async(resolve)=>{
            if(event.streams[0]){
                await console.log(event.streams[0])
                await console.log(remotestream.srcObject)
                remotestream.srcObject = await event.streams[0]
                await console.log(remotestream.srcObject)
            }
        }).then(()=>{
            console.log('done')
        })
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice' , {to: partnerId , data: event.candidate});
        }
    };


    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer' , {to: partnerId , data: offer});
    while (iceCandidateQueue.length) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
        console.log('new ice candidate added')
    }
}
socket.on('caller' , async(partnerTelegramId)=>{
    partnerId = await partnerTelegramId
    await createOffer()
})

socket.on('callee' , async(partnerTelegramId)=>{
    partnerId = await partnerTelegramId
})

socket.on('offer' , async(offer)=>{
            peerConnection =await new RTCPeerConnection(peerConnectionConfig);
            if(!stream){
                await shareMedia()
            }
            stream.getTracks().forEach(async(track) => {
               await peerConnection.addTrack(track, stream);
            });
        
            peerConnection.ontrack = async (event) => {
                return new Promise(async(resolve)=>{
                    if(event.streams[0]){
                        await console.log(event.streams[0])
                        await console.log(remotestream.srcObject)
                        remotestream.srcObject = await event.streams[0]
                        await console.log(remotestream.srcObject)
                    }
                }).then(()=>{
                    console.log('done')
                })
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice' , {to: partnerId , data: event.candidate});
                }
            };

            peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer' , {to: partnerId , data: answer});
            while (iceCandidateQueue.length) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
            }
})

socket.on('answer' , async(answer)=>{
    if (peerConnection.signalingState === 'have-remote-offer' || peerConnection.signalingState === 'have-local-pranswer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        while (iceCandidateQueue.length) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
        }
    }
})

socket.on('ice', async (ice) => {
    if (peerConnection && peerConnection.remoteDescription) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
            console.log('New ICE candidate added');
        } catch (error) {
            console.error('Error adding received ICE candidate:', error);
        }
    } else {
        console.warn('Remote description not set yet, storing ICE candidate in queue.');
        iceCandidateQueue.push(ice);
    }
});
