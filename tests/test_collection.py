import sys
import json
import duckdb
import pytest
from ravelry_analytics import collect
from ravelry_analytics.api_client import APIError

class FakeClient:
    omit_detail=False
    def __init__(self,*args): self.requests=0
    def get(self,path,params):
        self.requests+=1
        if path=='/patterns/search.json':
            start=(params['page']-1)*5+1
            return {'patterns':[{'id':i} for i in range(start,start+params['page_size'])],
                'paginator':{'page_count':3,'page':params['page'],'last_page':3}}
        ids=list(map(int,params['ids'].split()))
        if self.omit_detail: ids=ids[:-1]
        return {'patterns':{str(i):{'id':i,'projects_count':0,'rating_count':None,
                'pattern_author':{'id':100+i,'name':'discard'}} for i in ids}}

def setup(monkeypatch,tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(collect,'Client',FakeClient)
    monkeypatch.setenv('RAVELRY_API_USERNAME','dummy')
    monkeypatch.setenv('RAVELRY_API_PASSWORD','dummy')
    monkeypatch.setattr(sys,'argv',['collect','--limit','7','--private-use'])

def test_pagination_unique_grain_and_no_implicit_refresh(monkeypatch,tmp_path):
    setup(monkeypatch,tmp_path);collect.main()
    c=duckdb.connect('data/ravelry.duckdb')
    assert c.execute('select count(*),count(distinct pattern_id) from raw_patterns').fetchone()==(7,7)
    p=json.loads(c.execute('select provenance from collection_runs').fetchone()[0])
    assert p['http_requests']==3 and len(p['pages'])==2
    assert 'name' not in c.execute('select payload from raw_patterns limit 1').fetchone()[0]
    c.close()
    with pytest.raises(APIError,match='already exists'):collect.main()

def test_missing_detail_never_marked_complete(monkeypatch,tmp_path):
    setup(monkeypatch,tmp_path)
    monkeypatch.setattr(FakeClient,'omit_detail',True)
    with pytest.raises(APIError,match='Missing/mismatched'):collect.main()
    c=duckdb.connect('data/ravelry.duckdb')
    assert c.execute('select count(*) from collection_runs').fetchone()[0]==0
    assert c.execute('select count(*) from raw_patterns').fetchone()[0]==0
    c.close()
