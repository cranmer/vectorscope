"""Command-line interface for VectorScope."""

import argparse
import sys


def main():
    """Main entry point for the VectorScope CLI."""
    parser = argparse.ArgumentParser(
        description="VectorScope - Interactive vector embedding visualization",
        prog="vectorscope",
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind to (default: 8000)",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development",
    )
    parser.add_argument(
        "--version",
        action="store_true",
        help="Show version and exit",
    )

    args = parser.parse_args()

    if args.version:
        print("VectorScope v1.2.0")
        sys.exit(0)

    # Import uvicorn here to avoid slow startup for --version
    import uvicorn

    print(f"Starting VectorScope at http://{args.host}:{args.port}")
    print("Press Ctrl+C to stop")

    uvicorn.run(
        "backend.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
