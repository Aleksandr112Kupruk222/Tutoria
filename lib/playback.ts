import type {Lesson} from './lessons';
export function stepAtTime(steps:Lesson['steps'],mediaId:string,time:number){
 let found=-1,best=-Infinity,first=-1,earliest=Infinity;
 steps.forEach((s,i)=>{if(s.mediaId!==mediaId)return;if(s.seconds<earliest){earliest=s.seconds;first=i;}if(s.seconds<=time&&s.seconds>best){best=s.seconds;found=i;}});
 return found<0?first:found;
}
