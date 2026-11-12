from unittest.mock import Mock
import pytest
import requests
from ravelry_analytics.api_client import Client, APIError
from ravelry_analytics.collect import minimise

def response(code, body=None, headers=None):
    r=Mock(status_code=code,headers=headers or {})
    r.json.return_value=body or {"patterns":{}}
    return r

def client(responses):
    session=Mock();session.headers={};session.get.side_effect=responses
    waits=[]
    c=Client("dummy", "dummy", interval=0, session=session,sleep=waits.append)
    return c,session,waits

def test_retry_after_and_timeout():
    c,s,waits=client([response(429,headers={"Retry-After":"3"}),response(200)])
    c.get("/patterns.json",{"ids":"1"})
    assert max(waits)>=3 and c.requests==2
    assert s.get.call_args.kwargs['timeout']==(5,20)
    assert s.get.call_args.kwargs['allow_redirects'] is False

@pytest.mark.parametrize('code',[401,403,404,302])
def test_terminal_errors_never_retried(code):
    c,s,_=client([response(code)])
    with pytest.raises(APIError,match=f"HTTP {code}"):c.get('/patterns.json')
    assert s.get.call_count==1

def test_long_retry_after_stops():
    c,s,_=client([response(429,headers={'Retry-After':'120'})])
    with pytest.raises(APIError,match='run budget'):c.get('/patterns.json')
    assert s.get.call_count==1

def test_network_budget():
    c,s,_=client([requests.Timeout()]*3)
    with pytest.raises(APIError,match='Network failure'):c.get('/patterns.json')
    assert s.get.call_count==3

def test_endpoint_allowlist():
    c,s,_=client([])
    with pytest.raises(APIError,match='allowlisted'):c.get('/people/me.json')
    s.get.assert_not_called()

def test_minimise_preserves_unknown_and_zero():
    record={'id':1,'projects_count':0,'rating_count':None,'photos':['private'], 'notes':'private',
       'pattern_author':{'id':2,'name':'person','users':[{'username':'private'}]}}
    result=minimise(record)
    assert result['projects_count']==0 and result['rating_count'] is None
    assert 'difficulty_count' not in result
    assert result['designer_id']==2
    assert not {'photos','notes','pattern_author'} & result.keys()
