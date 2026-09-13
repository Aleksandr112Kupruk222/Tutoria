"use client";
import {useEffect,useRef,useState} from "react";
type Player={getCurrentTime:()=>number;seekTo:(seconds:number,ahead:boolean)=>void;playVideo:()=>void;destroy:()=>void};
type YouTube={Player:new(element:HTMLElement,options:Record<string,unknown>)=>Player};
declare global {interface Window {YT?:YouTube;onYouTubeIframeAPIReady?:()=>void}}
let loading:Promise<YouTube>|undefined;
function loadApi(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(!loading)loading=new Promise<YouTube>((resolve,reject)=>{
  const timer=setTimeout(()=>{loading=undefined;reject(Error('The video player could not connect. Use the YouTube link below.'));},15000);
  const previous=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{previous?.();clearTimeout(timer);if(window.YT)resolve(window.YT);};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);loading=undefined;reject(Error('The video player is blocked. Use the YouTube link below.'));};document.head.appendChild(script);
 });return loading;
}
export default function SyncedVideo({videoId,title,seconds,requestId,onTime}:{videoId:string;title:string;seconds:number;requestId:number;onTime:(time:number)=>void}){
 const host=useRef<HTMLDivElement>(null),player=useRef<Player|null>(null),ready=useRef(false),latest=useRef({seconds,onTime}),[error,setError]=useState('');latest.current={seconds,onTime};
 useEffect(()=>{
  let disposed=false,interval:ReturnType<typeof setInterval>|undefined;setError('');ready.current=false;
  loadApi().then(YT=>{
   if(disposed||!host.current)return;
   const element=document.createElement('div');host.current.appendChild(element);
   player.current=new YT.Player(element,{host:'https://www.youtube-nocookie.com',videoId,playerVars:{origin:window.location.origin,playsinline:1,rel:0,autoplay:1,start:latest.current.seconds},events:{
    onReady:()=>{if(disposed)return;ready.current=true;player.current?.seekTo(latest.current.seconds,true);player.current?.playVideo();const frame=host.current?.querySelector('iframe');if(frame)frame.title=title;interval=setInterval(()=>{const t=player.current?.getCurrentTime();if(typeof t==='number'&&Number.isFinite(t))latest.current.onTime(t);},500);},
    onError:()=>setError('This video cannot play here. Open it on YouTube using the link below.')
   }});
  }).catch(e=>{if(!disposed)setError(e.message);});
  return()=>{disposed=true;if(interval)clearInterval(interval);ready.current=false;player.current?.destroy();player.current=null;host.current?.replaceChildren();};
 },[videoId,title]);
 useEffect(()=>{if(ready.current){player.current?.seekTo(seconds,true);player.current?.playVideo();}},[seconds,requestId]);
 return <><div className="synced-video" ref={host}/>{error&&<p className="player-error" role="alert">{error}</p>}</>;
}
