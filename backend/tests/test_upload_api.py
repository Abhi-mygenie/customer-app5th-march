"""
Test suite for image upload functionality
Tests: POST /api/upload/image, GET /api/uploads/{filename}
"""
import pytest
import requests
import os
import io

# Use the public API URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "owner@18march.com"
TEST_PASSWORD = "admin123"


class TestUploadAuth:
    """Test authentication requirements for upload endpoint"""
    
    def test_upload_requires_auth(self):
        """Upload endpoint should reject requests without auth token"""
        # Create a dummy image file
        dummy_file = io.BytesIO(b"fake image data")
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files={"file": ("test.png", dummy_file, "image/png")}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: Upload without auth returns 401")


class TestUploadWithAuth:
    """Test upload functionality with valid authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for restaurant admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone_or_email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        assert data.get("user_type") == "restaurant", "Expected restaurant user type"
        print(f"PASS: Authenticated as restaurant admin: {data.get('user', {}).get('email')}")
        return data.get("token")
    
    def test_upload_valid_image_png(self, auth_token):
        """Upload a valid PNG image and verify success response with URL"""
        # Create a minimal valid PNG (1x1 transparent pixel)
        png_bytes = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0x60, 0x00, 0x02, 0x00,
            0x00, 0x05, 0x00, 0x01, 0xE2, 0x26, 0x05, 0x9B,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,  # IEND chunk
            0xAE, 0x42, 0x60, 0x82
        ])
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"file": ("test_logo.png", io.BytesIO(png_bytes), "image/png")}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True, "Expected success=True in response"
        assert "url" in data, "Response should contain 'url' field"
        assert "filename" in data, "Response should contain 'filename' field"
        assert data["url"].startswith("/api/uploads/"), f"URL should start with /api/uploads/, got: {data['url']}"
        assert data["filename"].endswith(".png"), f"Filename should end with .png, got: {data['filename']}"
        
        print(f"PASS: Upload PNG success - URL: {data['url']}")
        return data["url"]
    
    def test_upload_valid_image_jpg(self, auth_token):
        """Upload a valid JPG image"""
        # Minimal valid JPEG (1x1 red pixel)
        jpg_bytes = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,  # JFIF header
            0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
            0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
            0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
            0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
            0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
            0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
            0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
            0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4,
            0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
            0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
            0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF,
            0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04,
            0x00, 0x00, 0x01, 0x7D, 0x01, 0x02, 0x03, 0x00,
            0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
            0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1,
            0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A,
            0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x34, 0x35,
            0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55,
            0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64, 0x65,
            0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85,
            0x86, 0x87, 0x88, 0x89, 0x8A, 0x92, 0x93, 0x94,
            0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2,
            0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA,
            0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8,
            0xD9, 0xDA, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6,
            0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA,
            0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
            0xFB, 0xD5, 0xDB, 0x00, 0x31, 0xC4, 0x5E, 0xF9,
            0xE1, 0xB9, 0xF2, 0xB6, 0x2A, 0x6A, 0x2D, 0x78,
            0x93, 0x5B, 0xBC, 0x4B, 0x29, 0x18, 0xB4, 0x1D,
            0x0E, 0xD5, 0xD0, 0xD5, 0x0C, 0x72, 0xA4, 0xFE,
            0xFF, 0xD9
        ])
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"file": ("test_banner.jpg", io.BytesIO(jpg_bytes), "image/jpeg")}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data["filename"].endswith(".jpg")
        
        print(f"PASS: Upload JPG success - URL: {data['url']}")
    
    def test_upload_reject_invalid_extension_txt(self, auth_token):
        """Upload endpoint should reject files with invalid extension (.txt)"""
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"file": ("test.txt", io.BytesIO(b"This is a text file"), "text/plain")}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "not allowed" in data.get("detail", "").lower(), f"Expected 'not allowed' in error message, got: {data}"
        
        print("PASS: Upload .txt file rejected with 400")
    
    def test_upload_reject_invalid_extension_pdf(self, auth_token):
        """Upload endpoint should reject PDF files"""
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"file": ("document.pdf", io.BytesIO(b"%PDF-1.4 fake pdf"), "application/pdf")}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Upload .pdf file rejected with 400")
    
    def test_upload_and_access_file(self, auth_token):
        """Upload a file and verify it's accessible via static serving"""
        # Create minimal valid PNG
        png_bytes = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0x60, 0x00, 0x02, 0x00,
            0x00, 0x05, 0x00, 0x01, 0xE2, 0x26, 0x05, 0x9B,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
            0xAE, 0x42, 0x60, 0x82
        ])
        
        # Upload
        upload_response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"file": ("static_test.png", io.BytesIO(png_bytes), "image/png")}
        )
        
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        url = upload_data["url"]
        filename = upload_data["filename"]
        
        # Access the uploaded file (no auth required for static files)
        full_url = f"{BASE_URL}{url}"
        access_response = requests.get(full_url)
        
        assert access_response.status_code == 200, f"Expected 200 when accessing {full_url}, got {access_response.status_code}"
        assert len(access_response.content) > 0, "Accessed file should have content"
        
        print(f"PASS: Uploaded file accessible at {full_url}")


class TestUploadFileTypes:
    """Test various allowed file types"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone_or_email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code}")
        return response.json().get("token")
    
    def test_upload_gif(self, auth_token):
        """Upload GIF file"""
        # Minimal valid GIF (1x1 transparent)
        gif_bytes = bytes([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,  # GIF89a header
            0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF,
            0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00,
            0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
            0x01, 0x00, 0x3B
        ])
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"file": ("test.gif", io.BytesIO(gif_bytes), "image/gif")}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["filename"].endswith(".gif")
        print("PASS: Upload GIF success")
    
    def test_upload_webp(self, auth_token):
        """Upload WebP file"""
        # Minimal valid WebP
        webp_bytes = bytes([
            0x52, 0x49, 0x46, 0x46,  # RIFF
            0x24, 0x00, 0x00, 0x00,  # File size
            0x57, 0x45, 0x42, 0x50,  # WEBP
            0x56, 0x50, 0x38, 0x4C,  # VP8L
            0x17, 0x00, 0x00, 0x00,  # Chunk size
            0x2F, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00
        ])
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"file": ("test.webp", io.BytesIO(webp_bytes), "image/webp")}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["filename"].endswith(".webp")
        print("PASS: Upload WebP success")
    
    def test_upload_svg(self, auth_token):
        """Upload SVG file"""
        svg_content = b'''<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect fill="red"/></svg>'''
        
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            headers={"Authorization": f"Bearer {auth_token}"},
            files={"file": ("test.svg", io.BytesIO(svg_content), "image/svg+xml")}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["filename"].endswith(".svg")
        print("PASS: Upload SVG success")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
