from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator

from .models import InventoryTransactionType, PaymentMethod, SalesChannel, UserRole, UserStatus


class RegisterCompanyRequest(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    industry: str = Field(min_length=1, max_length=100)
    company_email: EmailStr
    company_address: str = Field(min_length=1)
    company_phone: str = Field(min_length=1, max_length=50)
    owner_name: str = Field(min_length=1, max_length=255)
    owner_email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    confirm_password: str = Field(min_length=8, max_length=72)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Password and confirm password do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=72)
    confirm_new_password: str = Field(min_length=8, max_length=72)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("New password and confirm password do not match")
        return self


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=72)
    confirm_new_password: str = Field(min_length=8, max_length=72)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("New password and confirm password do not match")
        return self


class InviteUserRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: UserRole = UserRole.VIEWER


class UpdateUserRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    role: UserRole | None = None
    status: UserStatus | None = None


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)


class UpdateCompanyRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: str | None = Field(default=None, min_length=1, max_length=100)
    address: str | None = Field(default=None, min_length=1)
    phone: str | None = Field(default=None, min_length=1, max_length=50)


class CategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    isActive: bool = True


class UpdateCategoryRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    isActive: bool | None = None


class ProductRequest(BaseModel):
    categoryId: str = Field(min_length=1)
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    brand: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    price: float = Field(gt=0)
    cost: float = Field(default=0, ge=0)
    stockQuantity: int = Field(default=0, ge=0)
    reorderLevel: int = Field(default=10, ge=0)
    unitOfMeasure: str = Field(default="unit", min_length=1, max_length=32)
    isActive: bool = True

    @model_validator(mode="after")
    def cost_within_price(self):
        if self.cost > self.price:
            raise ValueError("Cost Price cannot exceed Unit Price")
        return self


class UpdateProductRequest(BaseModel):
    categoryId: str | None = Field(default=None, min_length=1)
    sku: str | None = Field(default=None, min_length=1, max_length=64)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    brand: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    price: float | None = Field(default=None, gt=0)
    cost: float | None = Field(default=None, ge=0)
    stockQuantity: int | None = Field(default=None, ge=0)
    reorderLevel: int | None = Field(default=None, ge=0)
    unitOfMeasure: str | None = Field(default=None, min_length=1, max_length=32)
    isActive: bool | None = None

    @model_validator(mode="after")
    def cost_within_price(self):
        if self.cost is not None and self.price is not None and self.cost > self.price:
            raise ValueError("Cost Price cannot exceed Unit Price")
        return self


class ProductStatusRequest(BaseModel):
    isActive: bool


class InventoryTransactionRequest(BaseModel):
    productId: str
    type: InventoryTransactionType
    quantity: int = Field(gt=0)
    note: str | None = Field(default=None, max_length=500)


class SaleItemRequest(BaseModel):
    productId: str = Field(min_length=1)
    quantity: int = Field(gt=0)
    unitPrice: float | None = Field(default=None, ge=0)
    discount: float = Field(default=0, ge=0)
    tax: float = Field(default=0, ge=0)


class SaleRequest(BaseModel):
    customerName: str | None = Field(default=None, max_length=255)
    saleDate: datetime | None = None
    salesChannel: SalesChannel = SalesChannel.RETAIL_STORE
    paymentMethod: PaymentMethod = PaymentMethod.CASH
    items: list[SaleItemRequest] = Field(min_length=1)


class UpdateSaleRequest(BaseModel):
    customerName: str | None = Field(default=None, max_length=255)
    saleDate: datetime | None = None
    salesChannel: SalesChannel | None = None
    paymentMethod: PaymentMethod | None = None
    items: list[SaleItemRequest] | None = Field(default=None, min_length=1)
