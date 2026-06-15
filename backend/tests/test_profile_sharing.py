
def test_share_valid_slug_returns_profile(unauthed_client):
    from deps import get_supabase
    from main import app
    from unittest.mock import MagicMock
    
    mock_sb = MagicMock()
    def mock_table(table_name):
        class TableMock:
            def select(self, *args): return self
            def eq(self, *args): return self
            def execute(self):
                if table_name == "profile_shares":
                    return type("Result", (), {"data": [{"profile_id": "profile123", "is_active": True}]})()
                elif table_name == "profiles":
                    return type("Result", (), {"data": [{"id": "profile123", "user_id": "test-user-id"}]})()
                elif table_name == "users":
                    return type("Result", (), {"data": [{"name": "John", "age": 30, "gender": "Male", "city": "Mumbai"}]})()
        return TableMock()
    mock_sb.table.side_effect = mock_table
    app.dependency_overrides[get_supabase] = lambda: mock_sb
    
    response = unauthed_client.get("/share/valid_slug")
    assert response.status_code == 200
    assert response.json()["name"] == "John"
    assert "user_id" not in response.json()
    assert "phone" not in response.json()

def test_share_inactive_slug(unauthed_client):
    from deps import get_supabase
    from main import app
    from unittest.mock import MagicMock
    
    mock_sb = MagicMock()
    def mock_table(table_name):
        class TableMock:
            def select(self, *args): return self
            def eq(self, *args): return self
            def execute(self):
                if table_name == "profile_shares":
                    return type("Result", (), {"data": [{"profile_id": "profile123", "is_active": False}]})()
        return TableMock()
    mock_sb.table.side_effect = mock_table
    app.dependency_overrides[get_supabase] = lambda: mock_sb
    
    response = unauthed_client.get("/share/inactive_slug")
    assert response.status_code == 404
    assert "inactive" in response.json()["detail"]

def test_share_slug_profile_deleted(unauthed_client):
    from deps import get_supabase
    from main import app
    from unittest.mock import MagicMock
    
    mock_sb = MagicMock()
    def mock_table(table_name):
        class TableMock:
            def select(self, *args): return self
            def eq(self, *args): return self
            def execute(self):
                if table_name == "profile_shares":
                    return type("Result", (), {"data": [{"profile_id": "profile123", "is_active": True}]})()
                elif table_name == "profiles":
                    return type("Result", (), {"data": []})()
        return TableMock()
    mock_sb.table.side_effect = mock_table
    app.dependency_overrides[get_supabase] = lambda: mock_sb
    
    response = unauthed_client.get("/share/slug_with_no_profile")
    assert response.status_code == 404
    assert "Profile not found" in response.json()["detail"]
