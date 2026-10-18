import importlib.util,json,tempfile,unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('usage',Path(__file__).with_name('codex-token-records.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class UsageTests(unittest.TestCase):
 def read(self,rows):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t)/'s.jsonl';p.write_text('\n'.join(json.dumps(r) for r in rows));return m.read_codex([p],'2026-10-12','2026-10-14', [('03_school_project/02_RISE','039')])[0]
 def row(self,typ,p):return {'type':typ,'timestamp':'2026-10-12T16:00:00Z','payload':p}
 def test_response_dedup_and_mirror(self):
  u={'input_tokens':100,'cached_input_tokens':40,'output_tokens':20,'reasoning_output_tokens':5,'total_tokens':120}
  r=self.row('token_usage_record',{'response_id':'r1','usage':u})
  rows=self.read([r,r,self.row('event_msg',{'type':'token_count','info':{'total_token_usage':u}})])
  self.assertEqual(len(rows),1);self.assertEqual(rows[0]['in'],60);self.assertEqual(rows[0]['out'],20);self.assertEqual(rows[0]['day'],'2026-10-13')
 def test_equal_last_usage_still_counted_with_growth(self):
  rows=self.read([self.row('event_msg',{'type':'token_count','info':{'total_token_usage':{'input_tokens':n,'output_tokens':n//10}}}) for n in [100,100,200]])
  self.assertEqual(sum(x['out'] for x in rows),20)
 def test_rise_alias_not_overridden_by_folder_number(self):
  self.assertEqual(m.mapped(str(m.ROOT)+'/03_school_project/02_RISE',m.project_paths()),'039')
 def test_explicit_project_boundary(self):
  rows=self.read([self.row('turn_context',{'cwd':str(m.ROOT)+'/03_school_project/02_RISE','model':'test'}),self.row('token_usage_record',{'response_id':'r2','usage':{'output_tokens':5}})])
  self.assertEqual(rows[0]['projectId'],'039')
 def test_same_turn_tool_path_inference(self):
  rows=self.read([self.row('turn_context',{'turn_id':'t','cwd':str(m.ROOT)}),self.row('response_item',{'type':'custom_tool_call','input':'write 03_school_project/02_RISE/poster.py'}),self.row('token_usage_record',{'response_id':'r4','turn_id':'t','usage':{'output_tokens':5}})])
  self.assertEqual(rows[0]['projectId'],'039');self.assertEqual(rows[0]['basis'],'same-turn-tool-path-inference')
 def test_unassigned_not_distributed(self):
  rows=self.read([self.row('turn_context',{'cwd':str(m.ROOT)}),self.row('token_usage_record',{'response_id':'r3','usage':{'output_tokens':5}})])
  self.assertIsNone(rows[0]['projectId'])
if __name__=='__main__':unittest.main()
