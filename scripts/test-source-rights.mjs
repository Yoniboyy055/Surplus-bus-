import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSourceRight, requireSourceRight } from '../lib/data-rights/source-rights.mjs';
import { readFileSync } from 'node:fs';
const now = new Date('2026-11-09T12:00:00Z');
const approved = {
  id:'test-fixture',status:'approved',active:true,
  allowedActions:['collect','derive_price'],
  licenceUrl:'https://example.org/licence',approvedBy:'local-fixture',
  reviewedAt:'2026-11-01',expiresAt:'2026-12-31'
};
const reg=JSON.parse(readFileSync(new URL('../config/source-rights.json',import.meta.url),'utf8'));
test('unknown actions fail closed',()=>assert.equal(evaluateSourceRight(approved,'scrape',now).reason,'unknown_action'));
test('unknown source fails closed',()=>assert.equal(evaluateSourceRight(null,'collect',now).reason,'unknown_source'));
test('the shipped registry authorizes NO source use',()=>{
 for(const s of reg.sources)for(const act of ['collect','derive_price','display','retain','redistribute','model_training'])
  assert.equal(evaluateSourceRight(s,act,now).allowed,false,s.id+' '+act);
});
test('test-only approved source can collect and derive price',()=>{
 assert.equal(evaluateSourceRight(approved,'collect',now).allowed,true);
 assert.equal(evaluateSourceRight(approved,'derive_price',now).allowed,true);
});
test('commercial pricing is not implied by collection rights',()=>assert.equal(evaluateSourceRight({...approved,allowedActions:['collect']},'derive_price',now).reason,'action_not_licensed'));
test('price derivation without collection permission is denied',()=>assert.equal(evaluateSourceRight({...approved,allowedActions:['derive_price']},'derive_price',now).reason,'no_collection_right'));
test('public availability is not sufficient',()=>assert.equal(evaluateSourceRight({...approved,status:'pending'},'collect',now).reason,'not_approved'));
test('missing sign-off is denied',()=>assert.equal(evaluateSourceRight({...approved,approvedBy:''},'collect',now).reason,'missing_approval'));
test('unreviewed or expired grants are denied',()=>{
 assert.equal(evaluateSourceRight({...approved,reviewedAt:null},'collect',now).reason,'missing_review_date');
 assert.equal(evaluateSourceRight({...approved,expiresAt:'2026-10-30'},'collect',now).reason,'expired');
});
test('public display requires explicit rights',()=>assert.equal(evaluateSourceRight(approved,'display',now).reason,'action_not_licensed'));
test('registry lookups reject unknown/restricted sources with typed error',()=>{
 assert.throws(()=>requireSourceRight(reg,'unknown','collect',now),{code:'SOURCE_RIGHTS_DENIED'});
 assert.throws(()=>requireSourceRight(reg,'ebay_browse','derive_price',now),{code:'SOURCE_RIGHTS_DENIED'});
});