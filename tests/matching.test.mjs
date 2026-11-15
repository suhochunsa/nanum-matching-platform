import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const migrationDir = new URL('../supabase/migrations/', import.meta.url)
async function database() {
  const db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create table auth.users(id uuid primary key default gen_random_uuid(),raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,storage to anon,authenticated;
    create table storage.objects(name text,bucket_id text);
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;
    alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`)
  for (const file of readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(file, migrationDir), 'utf8'))
  }
  // 매칭 관련 마이그레이션은 순서대로 다시 실행해도 같은 상태를 유지한다.
  for (const file of ['20261101010000_match_requests_credits.sql', '20261116000000_delivery_completion.sql']) {
    await db.exec(readFileSync(new URL(file, migrationDir), 'utf8'))
  }
  return db
}

async function admin(db, sql, args = []) { await db.exec('reset role'); return (await db.query(sql,args)).rows }
async function as(db, uid, sql, args = [], role = 'authenticated') {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid ?? ''])
  await db.exec(`set role ${role}`)
  return (await db.query(sql,args)).rows
}
let serial = 0
async function fixture(db, { quantity = 3, needQuantity = 2 } = {}) {
  const suffix = ++serial
  const [donor] = await admin(db, `insert into auth.users(raw_user_meta_data) values ($1) returning id`,[{role:'donor',nickname:'테스트기부자'}])
  const [orgUser] = await admin(db, `insert into auth.users(raw_user_meta_data) values ($1) returning id`,[{role:'institution',org_name:`테스트기관${suffix}`}])
  const [other] = await admin(db, `insert into auth.users(raw_user_meta_data) values ($1) returning id`,[{role:'institution',org_name:`다른기관${suffix}`}])
  const [org] = await admin(db, `insert into institutions(name,location,phone,methods,owner_id) values ($1,'서울시','02-123-4567',array['pickup'],$2) returning id`,[`테스트기관${suffix}`,orgUser.id])
  const [otherOrg] = await admin(db, `insert into institutions(name,location,phone,methods,owner_id) values ($1,'서울시','02-123-4567',array['pickup'],$2) returning id`,[`다른기관${suffix}`,other.id])
  const [contact] = await admin(db, `insert into donors(name,phone) values ('테스트기부자','010-0000-0000') returning id`)
  const [item] = await admin(db, `insert into donor_items(donor_id,owner_id,donor_display,title,categories,quantity,condition,region,methods) values ($1,$2,'테OO','겨울 패딩',array['의류/아우터'],$3,'새 상품','서울',array['pickup']) returning id`,[contact.id,donor.id,quantity])
  const [need] = await admin(db, `insert into institution_needs(institution_id,title,categories,quantity) values ($1,'겨울 패딩 점퍼',array['의류/아우터'],$2) returning id`,[org.id,needQuantity])
  const [otherNeed] = await admin(db, `insert into institution_needs(institution_id,title,categories,quantity) values ($1,'패딩',array['의류/아우터'],2) returning id`,[otherOrg.id])
  return { donor:donor.id, org:orgUser.id, other:other.id, item:item.id, need:need.id, otherNeed:otherNeed.id }
}
async function request(db,f,uid=f.donor,need=f.need,method='pickup') {
  return (await as(db,uid,'select public.request_item_match($1,$2,$3) id',[f.item,need,method]))[0].id
}
async function respond(db,uid,id,action) { return (await as(db,uid,'select public.respond_item_match($1,$2) result',[id,action]))[0].result }
async function complete(db,uid,id) { return (await as(db,uid,'select public.complete_item_match($1) result',[id]))[0].result }
// 수락된 매칭을 기부자·기관이 모두 전달 완료한다.
async function finish(db,f,id) { await complete(db,f.donor,id); return complete(db,f.org,id) }
async function dashboard(db,uid) { return (await as(db,uid,'select public.get_my_matching_dashboard() data'))[0].data }

const db = await database()
    await test('기부자 요청은 기관 요청함에 도착하고 수락 전 적립하지 않는다',async()=>{
      const f=await fixture(db); const id=await request(db,f)
      const sent=await dashboard(db,f.donor); const received=await dashboard(db,f.org)
      assert.equal(sent.requests[0].id,id); assert.equal(sent.requests[0].incoming,false)
      assert.equal(received.requests[0].incoming,true); assert.equal(sent.creditTotal,0)
      assert.equal(received.requests[0].quantity,3); assert.equal(received.requests[0].credit_amount,50)
      assert.equal(received.requests[0].contact_phone,null)
      assert.deepEqual((await dashboard(db,f.other)).requests,[])
      assert.equal((await as(db,f.other,'select * from matches')).length,0)
    })
    await test('요청자 본인 수락·거절, 수신자의 취소, 제삼자 응답을 막는다',async()=>{
      const f=await fixture(db); const id=await request(db,f)
      await assert.rejects(respond(db,f.donor,id,'accept'),/받은 요청/)
      await assert.rejects(respond(db,f.donor,id,'reject'),/받은 요청/)
      await assert.rejects(respond(db,f.org,id,'cancel'),/보낸 요청/)
      await assert.rejects(respond(db,f.other,id,'accept'),/권한/)
      await assert.rejects(request(db,f,f.other),/내가 등록/)
    })
    await test('수락하면 매칭만 확정되고 크레딧은 적립하지 않는다',async()=>{
      const f=await fixture(db); const id=await request(db,f)
      assert.deepEqual(await respond(db,f.org,id,'accept'),{status:'confirmed',credit:50,credited:false})
      await Promise.all([respond(db,f.org,id,'accept'),respond(db,f.org,id,'accept')])
      const mine=await dashboard(db,f.donor); assert.equal(mine.creditTotal,0); assert.equal(mine.creditEntries.length,0)
      assert.equal(mine.requests[0].status,'confirmed'); assert.equal(mine.requests[0].my_side,'donor')
      assert.equal(mine.requests[0].donor_done,false); assert.equal(mine.requests[0].institution_done,false)
      assert.equal((await dashboard(db,f.org)).requests[0].my_side,'institution')
      assert.equal(mine.requests[0].contact_phone,'02-123-4567')
      assert.equal((await dashboard(db,f.org)).requests[0].contact_phone,'010-0000-0000')
      assert.equal((await admin(db,'select status from donor_items where id=$1',[f.item]))[0].status,'matched')
      assert.equal((await admin(db,'select status from institution_needs where id=$1',[f.need]))[0].status,'fulfilled')
      await assert.rejects(request(db,f,f.donor,f.otherNeed),/이미 매칭/)
    })
    await test('양쪽이 모두 전달 완료를 눌러야 최종 완료되고 그때 한 번만 적립한다',async()=>{
      const f=await fixture(db); const id=await request(db,f); await respond(db,f.org,id,'accept')
      assert.deepEqual(await complete(db,f.donor,id),{status:'confirmed',credit:50,credited:false,donorDone:true,institutionDone:false})
      assert.deepEqual(await complete(db,f.donor,id),{status:'confirmed',credit:50,credited:false,donorDone:true,institutionDone:false})
      assert.equal((await dashboard(db,f.donor)).creditTotal,0)
      assert.equal((await dashboard(db,f.org)).requests[0].donor_done,true)
      assert.equal((await admin(db,'select status from donor_items where id=$1',[f.item]))[0].status,'matched')
      assert.deepEqual(await complete(db,f.org,id),{status:'completed',credit:50,credited:true,donorDone:true,institutionDone:true})
      await Promise.all([complete(db,f.org,id),complete(db,f.donor,id)])
      const mine=await dashboard(db,f.donor); assert.equal(mine.creditTotal,50); assert.equal(mine.creditEntries.length,1)
      assert.equal(mine.requests[0].status,'completed'); assert.ok(mine.requests[0].completed_at)
      assert.equal((await dashboard(db,f.org)).creditTotal,0)
      assert.equal((await admin(db,'select status from donor_items where id=$1',[f.item]))[0].status,'donated')
    })
    await test('요청 상태·거절된 매칭·제삼자·비회원은 전달 완료를 누를 수 없다',async()=>{
      const f=await fixture(db); const id=await request(db,f)
      await assert.rejects(complete(db,f.donor,id),/수락된 매칭만/)
      await assert.rejects(complete(db,f.other,id),/권한/)
      await assert.rejects(as(db,null,'select public.complete_item_match($1)',[id],'anon'),/permission denied/)
      await respond(db,f.org,id,'reject')
      await assert.rejects(complete(db,f.org,id),/수락된 매칭만/)
      await assert.rejects(as(db,f.donor,"update matches set donor_done_at=now(), institution_done_at=now() where id=$1",[id]),/permission denied/)
    })
    await test('기관이 요청하고 기부자가 수락해도 전달 완료 후 기부자에게 적립한다',async()=>{
      const f=await fixture(db); const id=await request(db,f,f.org)
      assert.equal((await dashboard(db,f.donor)).requests[0].incoming,true)
      await respond(db,f.donor,id,'accept')
      assert.equal((await dashboard(db,f.donor)).creditTotal,0)
      await complete(db,f.org,id); await complete(db,f.donor,id)
      assert.equal((await dashboard(db,f.donor)).creditTotal,50)
      assert.equal((await dashboard(db,f.org)).creditTotal,0)
    })
    await test('동일 물품의 여러 요청 중 하나 수락하면 나머지를 자동 취소한다',async()=>{
      const f=await fixture(db); const first=await request(db,f); const second=await request(db,f,f.other,f.otherNeed)
      await respond(db,f.org,first,'accept')
      assert.equal((await admin(db,'select status from matches where id=$1',[second]))[0].status,'cancelled')
      await assert.rejects(respond(db,f.donor,second,'accept'),/이미 처리/)
      await finish(db,f,first)
      assert.equal((await dashboard(db,f.donor)).creditTotal,50)
    })
    await test('거절·취소는 적립하지 않으며 중복 대기 요청을 막고 재요청할 수 있다',async()=>{
      const f=await fixture(db); const id=await request(db,f)
      await assert.rejects(request(db,f),/이미 대기/)
      await respond(db,f.org,id,'reject'); assert.equal((await dashboard(db,f.donor)).creditTotal,0)
      assert.equal(await request(db,f),id)
      await respond(db,f.donor,id,'cancel'); assert.equal((await dashboard(db,f.donor)).creditTotal,0)
      assert.equal(await request(db,f,f.org),id)
      await respond(db,f.donor,id,'reject')
    })
    await test('비회원·익명은 함수에 접근하거나 크레딧을 직접 조작할 수 없다',async()=>{
      const f=await fixture(db)
      await assert.rejects(as(db,null,'select public.request_item_match($1,$2,$3)',[f.item,f.need,'pickup'],'anon'),/permission denied/)
      await assert.rejects(as(db,null,'select public.get_my_matching_dashboard()',[],'anon'),/permission denied/)
      await assert.rejects(as(db,null,'select public.get_my_matching_dashboard()'),/로그인/)
      await assert.rejects(as(db,f.donor,"insert into matching_credit_entries(user_id,amount,item_title) values ($1,1000,'위조')",[f.donor]),/permission denied/)
      await assert.rejects(as(db,f.donor,"update matches set status='confirmed'"),/permission denied/)
    })
    await test('지원하지 않는 전달 방법·예시 소유자·조건 불일치 요청을 거절한다',async()=>{
      const f=await fixture(db)
      await assert.rejects(request(db,f,f.donor,f.need,'parcel'),/전달 방법/)
      await admin(db,"update donor_items set title='전기 난로',categories=array['생활용품/가전'] where id=$1",[f.item])
      await assert.rejects(request(db,f),/조건이 맞는/)
      await admin(db,'update donor_items set owner_id=null where id=$1',[f.item])
      await assert.rejects(request(db,f,f.org),/가입한 계정/)
    })
    await test('기한 만료·수량 변경·전달 방법 변경 후 수락을 막는다',async()=>{
      const f=await fixture(db); const id=await request(db,f)
      await admin(db,"update donor_items set available_until='2000-01-01' where id=$1",[f.item])
      await assert.rejects(respond(db,f.org,id,'accept'),/기간이 지난/)
      await admin(db,'update donor_items set available_until=null,quantity=5 where id=$1',[f.item])
      await assert.rejects(respond(db,f.org,id,'accept'),/수량이 바뀌/)
      await admin(db,"update donor_items set quantity=3,methods=array['parcel'] where id=$1",[f.item])
      await assert.rejects(respond(db,f.org,id,'accept'),/전달 방법/)
      assert.equal((await dashboard(db,f.donor)).creditTotal,0)
    })
    await test('공급이 부족하면 기관의 남은 필요 수량을 유지한다',async()=>{
      const f=await fixture(db,{quantity:2,needQuantity:5}); const id=await request(db,f)
      await respond(db,f.org,id,'accept')
      const [need]=await admin(db,'select quantity,status from institution_needs where id=$1',[f.need])
      assert.deepEqual(need,{quantity:3,status:'open'})
      await finish(db,f,id)
      assert.equal((await dashboard(db,f.donor)).creditTotal,40)
    })
    await test('확정 후 다시 공개·수량 변경을 막고, 전달 완료 전에는 직접 기부 완료로 바꿀 수 없다',async()=>{
      const f=await fixture(db); const id=await request(db,f); await respond(db,f.org,id,'accept')
      await assert.rejects(as(db,f.donor,"update donor_items set status='available' where id=$1",[f.item]),/확정된 물품/)
      await assert.rejects(as(db,f.donor,'update donor_items set quantity=10 where id=$1',[f.item]),/확정된 물품/)
      await assert.rejects(as(db,f.donor,"update donor_items set status='donated' where id=$1",[f.item]),/전달 완료/)
      await finish(db,f,id)
      assert.equal((await admin(db,'select status from donor_items where id=$1',[f.item]))[0].status,'donated')
      await assert.rejects(as(db,f.donor,"update donor_items set status='available' where id=$1",[f.item]),/확정된 물품/)
      assert.equal((await dashboard(db,f.donor)).creditTotal,50)
    })
    await test('필요 물품 삭제로 요청이 삭제돼도 적립 내역과 중복 방지가 남는다',async()=>{
      const f=await fixture(db); const id=await request(db,f); await respond(db,f.org,id,'accept'); await finish(db,f,id)
      await as(db,f.org,'delete from institution_needs where id=$1',[f.need])
      assert.equal((await dashboard(db,f.donor)).creditTotal,50)
      await assert.rejects(as(db,f.donor,"update donor_items set status='available' where id=$1",[f.item]),/확정된 물품/)
      assert.equal((await as(db,f.other,'select * from matching_credit_entries')).length,0)
      await as(db,f.donor,'delete from donor_items where id=$1',[f.item])
      assert.equal((await dashboard(db,f.donor)).creditTotal,50)
    })
    await test('예전 규칙으로 수락 때 적립된 크레딧은 회수되고 전달 완료 때 한 번만 다시 적립된다',async()=>{
      const f=await fixture(db); const id=await request(db,f); await respond(db,f.org,id,'accept')
      await admin(db,"insert into matching_credit_entries(user_id,match_id,donor_item_id,amount,item_title) values ($1,$2,$3,50,'겨울 패딩')",[f.donor,id,f.item])
      assert.equal((await dashboard(db,f.donor)).creditTotal,50)
      await db.exec('reset role')
      await db.exec(readFileSync(new URL('20261116000000_delivery_completion.sql', migrationDir), 'utf8'))
      assert.equal((await dashboard(db,f.donor)).creditTotal,0)
      await finish(db,f,id)
      const mine=await dashboard(db,f.donor); assert.equal(mine.creditTotal,50); assert.equal(mine.creditEntries.length,1)
    })

await test('운영 검증 SQL도 동일하게 통과하고 임시 데이터를 남기지 않는다', async () => {
  const before=(await admin(db,'select count(*) n from matching_credit_entries'))[0].n
  await db.exec(readFileSync(new URL('../supabase/tests/matching_smoke.sql',import.meta.url),'utf8'))
  assert.equal((await admin(db,'select count(*) n from matching_credit_entries'))[0].n,before)
})

// 테스트를 모두 await로 차례대로 실행하므로 마지막에 직접 닫는다. (after 훅은 첫 테스트가 끝나자마자 실행되어 DB를 닫아버렸다)
await db.close()
