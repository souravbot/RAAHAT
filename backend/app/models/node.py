"""Node model for the RAAHAT Regional Digital Twin."""

from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, field_validator


class NodeCategory(str, Enum):
    """Logical category of a node."""

    COMMUNITY = "COMMUNITY"
    SERVICE = "SERVICE"
    TRANSPORT = "TRANSPORT"


class NodeType(str, Enum):
    """Concrete node type."""

    VILLAGE = "VILLAGE"
    HOSPITAL = "HOSPITAL"
    WAREHOUSE = "WAREHOUSE"
    MARKET = "MARKET"
    ROAD_JUNCTION = "ROAD_JUNCTION"
    BRIDGE = "BRIDGE"


# Map node type -> logical category
NODE_CATEGORY_MAP: Dict[NodeType, NodeCategory] = {
    NodeType.VILLAGE: NodeCategory.COMMUNITY,
    NodeType.HOSPITAL: NodeCategory.SERVICE,
    NodeType.WAREHOUSE: NodeCategory.SERVICE,
    NodeType.MARKET: NodeCategory.SERVICE,
    NodeType.ROAD_JUNCTION: NodeCategory.TRANSPORT,
    NodeType.BRIDGE: NodeCategory.TRANSPORT,
}


class NodeState(BaseModel):
    """Current operational state of a node."""

    status: str = Field(default="NORMAL", description="Node status, e.g. NORMAL")


class RegionalNode(BaseModel):
    """A single node in the regional digital twin.

    `category` is a derived logical classification. If omitted at build time it
    is inferred from `type`; providing an explicit value is also supported.
    """

    id: str
    name: str
    type: NodeType
    category: Optional[NodeCategory] = None
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    state: NodeState = Field(default_factory=NodeState)

    @field_validator("category", mode="before")
    @classmethod
    def default_category(cls, v, info):
        if v is not None:
            return v
        node_type = info.data.get("type")
        if node_type is not None:
            return NODE_CATEGORY_MAP[node_type]
        return v

    def model_dump_simple(self) -> Dict[str, Any]:
        """Serializable representation without nested enum objects."""
        data = self.model_dump()
        data["type"] = self.type.value
        if data.get("category") is not None:
            data["category"] = NodeCategory(data["category"]).value
        return data
