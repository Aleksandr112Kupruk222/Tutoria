import {z} from "zod";
import {body,hashPassword,HttpError,json,random,type Env,type Teacher} from "./security";
export async function adminApi(request:Request,env:Env,user:Teacher){
  if(user.role!=="admin")throw new HttpError(403,"Administrator access is required.");
  const url=new URL(request.url),path=url.pathname.replace(/\/$/,"");
  if(path==="/api/admin/accounts"&&request.method==="GET")return json({accounts:(await env.DB.prepare("SELECT id,username,name,role,must_change FROM teachers WHERE deleted=0 ORDER BY name").all()).results});
  if(path==="/api/admin/accounts"&&request.method==="POST"){
    const v=z.object({username:z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,59}$/),name:z.string().trim().min(1).max(100),password:z.string().min(8).max(200)}).parse(await body(request));
    if(await env.DB.prepare("SELECT id FROM teachers WHERE username=?").bind(v.username).first())throw new HttpError(409,"That username is already used or retired. Choose another.");
    await env.DB.prepare("INSERT INTO teachers(id,username,name,password_hash,must_change,created_at,role) VALUES (?,?,?,?,1,?,'teacher')").bind(random().slice(0,24),v.username,v.name,await hashPassword(v.password),new Date().toISOString()).run();
    return json({ok:true},201);
  }
  const id=z.string().min(1).max(60).parse(url.searchParams.get("id"));
  const target=await env.DB.prepare("SELECT id FROM teachers WHERE id=? AND deleted=0").bind(id).first();
  if(!target)throw new HttpError(404,"Account not found.");
  if(path==="/api/admin/password"&&request.method==="POST"){
    const v=z.object({password:z.string().min(12).max(200)}).parse(await body(request));
    await env.DB.batch([env.DB.prepare("UPDATE teachers SET password_hash=?,must_change=1 WHERE id=?").bind(await hashPassword(v.password),id),env.DB.prepare("DELETE FROM sessions WHERE teacher_id=?").bind(id),env.DB.prepare("DELETE FROM oauth_states WHERE teacher_id=?").bind(id)]);
    return json({ok:true});
  }
  if(path==="/api/admin/account"&&request.method==="DELETE"){
    if(id===user.id)throw new HttpError(400,"You cannot delete your own administrator account.");
    await env.DB.batch([
      env.DB.prepare("UPDATE teachers SET deleted=1 WHERE id=?").bind(id),
      env.DB.prepare("DELETE FROM sessions WHERE teacher_id=?").bind(id),
      env.DB.prepare("DELETE FROM oauth_states WHERE teacher_id=?").bind(id),
      env.DB.prepare("DELETE FROM youtube_connections WHERE teacher_id=?").bind(id),
    ]);return json({ok:true});
  }
  throw new HttpError(404,"Not found.");
}
