

def test_get_own_profile(authed_client):
    pass

# It's better to patch inside the route directly for fine-grained control
def test_get_own_profile_direct(authed_client):
    from deps import get_supabase
    from main import app
    from unittest.mock import MagicMock
    
    mock_sb = MagicMock()
    def mock_table(table_name):
        class TableMock:
            def select(self, *args): return self
            def eq(self, *args): return self
            def execute(self):
                if table_name == "profiles":
                    return type("Result", (), {"data": [{"id": "profile123", "user_id": "test-user-id"}]})()
                elif table_name == "users":
                    return type("Result", (), {"data": [{"name": "John", "age": 30, "gender": "Male", "city": "Mumbai"}]})()
        return TableMock()
    mock_sb.table.side_effect = mock_table
    app.dependency_overrides[get_supabase] = lambda: mock_sb
    
    response = authed_client.get("/profile/profile123")
    assert response.status_code == 200
    assert response.json()["name"] == "John"

def test_get_other_users_profile(authed_client):
    from deps import get_supabase
    from main import app
    from unittest.mock import MagicMock
    
    mock_sb = MagicMock()
    def mock_table(table_name):
        class TableMock:
            def select(self, *args): return self
            def eq(self, *args): return self
            def execute(self):
                if table_name == "profiles":
                    return type("Result", (), {"data": [{"id": "profile123", "user_id": "other-user-id"}]})()
        return TableMock()
    mock_sb.table.side_effect = mock_table
    app.dependency_overrides[get_supabase] = lambda: mock_sb
    
    response = authed_client.get("/profile/profile123")
    assert response.status_code == 403
    assert "Not authorized" in response.json()["detail"]
