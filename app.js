import { peerConnectionConfig } from './PeerConfiguration.js';
const myTelegramId = getTelegramId()
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


async function getTelegramId(){
    await window.Telegram.WebApp.ready()
    if (window.Telegram.WebApp.initDataUnsafe) {
        alert(window.Telegram.WebApp.initDataUnsafe.user.id)
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    } else {
        alert('Enter With Telegram')
        window.close()
    }
}


const socket = io(`https://miniapp-videocall-server.onrender.com/ws?userTelegramId=${myTelegramId}`);

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
    await socket.emit('startNewCall' , myTelegramId);
});





socket.on('message' , async(message)=>{
    if(message.type == 'caller'){
        if (!peerConnection || peerConnection.signalingState === 'closed') {
            peerConnection = new RTCPeerConnection(peerConnectionConfig);
        }
        partnerId = await message.data
        await startOffer();
    }

    else if(message.type == 'callee'){
        partnerId = await message.data
        if (!peerConnection || peerConnection.signalingState === 'closed') {
            peerConnection = new RTCPeerConnection(peerConnectionConfig);
        }
    }

    else if(message.type == 'offer'){
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
                        socket.emit('message' , {type: 'ice' , data: event.candidate , to: partnerId});
                    } catch (error) {
                        console.error('Error sending ICE candidate:', error);
                    }
                }
            };
    
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('message' , {type: 'answer' , data: answer , to: partnerId});
    
            while (iceCandidateQueue.length) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
            }
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    else if(message.type == 'answer'){
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));

        while (iceCandidateQueue.length) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
        }

    }

    else if(message.type == 'ice'){
        if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(message.data));
        } else {
            iceCandidateQueue.push(message.data);
        }
    }

    else if(message.type == 'disconnected'){
        if(partnerId == message.data){
            await endpeer();
        }
    }

})

